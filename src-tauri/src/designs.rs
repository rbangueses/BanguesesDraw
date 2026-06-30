use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub name: String,
    pub design_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesignSummary {
    pub project: String,
    pub name: String,
    pub file_name: String,
    pub updated_at_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DesignScene {
    pub project: String,
    pub name: String,
    pub file_name: String,
    pub content: Value,
}

#[derive(Debug, Error)]
pub enum DesignError {
    #[error("invalid name: {0}")]
    InvalidName(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("already exists: {0}")]
    AlreadyExists(String),
    #[error("invalid design file: {0}")]
    InvalidDesignFile(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
}

pub fn empty_scene() -> Value {
    json!({
        "type": "excalidraw",
        "version": 2,
        "source": "banguesesdraw",
        "elements": [],
        "appState": {},
        "files": {}
    })
}

const EXTENSION: &str = "excalidraw";

fn ensure_root(root: &Path) -> Result<(), DesignError> {
    fs::create_dir_all(root)?;
    Ok(())
}

fn validate_name(name: &str) -> Result<String, DesignError> {
    let trimmed = name.trim();
    if trimmed.is_empty()
        || trimmed == "."
        || trimmed == ".."
        || trimmed.contains('/')
        || trimmed.contains('\\')
        || trimmed.contains(':')
    {
        return Err(DesignError::InvalidName(name.to_string()));
    }

    Ok(trimmed.to_string())
}

fn design_file_name(name: &str) -> Result<String, DesignError> {
    let clean = validate_name(name)?;
    let suffix = format!(".{EXTENSION}");
    if clean.ends_with(&suffix) {
        Ok(clean)
    } else {
        Ok(format!("{clean}{suffix}"))
    }
}

fn design_name_from_file(file_name: &str) -> String {
    file_name
        .strip_suffix(&format!(".{EXTENSION}"))
        .unwrap_or(file_name)
        .to_string()
}

fn design_name_from_path(path: &Path) -> Result<String, DesignError> {
    let stem = path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .ok_or_else(|| DesignError::InvalidName(path.display().to_string()))?;

    validate_name(stem)
}

fn project_path(root: &Path, project: &str) -> Result<PathBuf, DesignError> {
    Ok(root.join(validate_name(project)?))
}

fn design_path(root: &Path, project: &str, file_name: &str) -> Result<PathBuf, DesignError> {
    let project_dir = project_path(root, project)?;
    let file_name = design_file_name(file_name)?;
    Ok(project_dir.join(file_name))
}

fn unique_design_path(
    root: &Path,
    project: &str,
    preferred_name: &str,
) -> Result<PathBuf, DesignError> {
    let project_dir = project_path(root, project)?;
    if !project_dir.exists() {
        return Err(DesignError::NotFound(project.to_string()));
    }

    let preferred_name = validate_name(preferred_name)?;
    let first = project_dir.join(design_file_name(&preferred_name)?);
    if !first.exists() {
        return Ok(first);
    }

    for index in 1.. {
        let candidate_name = if index == 1 {
            format!("{preferred_name} Copy")
        } else {
            format!("{preferred_name} Copy {index}")
        };
        let candidate = project_dir.join(design_file_name(&candidate_name)?);
        if !candidate.exists() {
            return Ok(candidate);
        }
    }

    unreachable!("unique design name search is unbounded");
}

fn modified_ms(path: &Path) -> u128 {
    fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn is_scene_file(path: &Path) -> bool {
    path.extension().and_then(|extension| extension.to_str()) == Some(EXTENSION)
}

fn project_summary(path: &Path) -> Result<ProjectSummary, DesignError> {
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| DesignError::InvalidName(path.display().to_string()))?
        .to_string();
    let design_count = fs::read_dir(path)?
        .filter_map(Result::ok)
        .filter(|entry| is_scene_file(&entry.path()))
        .count();

    Ok(ProjectSummary { name, design_count })
}

fn validate_scene(value: &Value) -> Result<(), DesignError> {
    if !value.is_object() {
        return Err(DesignError::InvalidDesignFile(
            "scene must be a JSON object".to_string(),
        ));
    }

    if value.get("type").and_then(Value::as_str) != Some("excalidraw") {
        return Err(DesignError::InvalidDesignFile(
            "missing type=excalidraw".to_string(),
        ));
    }

    if !value.get("elements").is_some_and(Value::is_array) {
        return Err(DesignError::InvalidDesignFile(
            "missing elements array".to_string(),
        ));
    }

    if !value.get("appState").is_some_and(Value::is_object) {
        return Err(DesignError::InvalidDesignFile(
            "missing appState object".to_string(),
        ));
    }

    if !value.get("files").is_some_and(Value::is_object) {
        return Err(DesignError::InvalidDesignFile(
            "missing files object".to_string(),
        ));
    }

    Ok(())
}

pub fn list_projects(root: &Path) -> Result<Vec<ProjectSummary>, DesignError> {
    ensure_root(root)?;
    let mut projects = fs::read_dir(root)?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_dir())
        .map(|entry| project_summary(&entry.path()))
        .collect::<Result<Vec<_>, _>>()?;
    projects.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(projects)
}

pub fn create_project(root: &Path, name: &str) -> Result<ProjectSummary, DesignError> {
    ensure_root(root)?;
    let path = project_path(root, name)?;
    if path.exists() {
        return Err(DesignError::AlreadyExists(name.to_string()));
    }

    fs::create_dir(&path)?;
    project_summary(&path)
}

pub fn rename_project(
    root: &Path,
    old_name: &str,
    new_name: &str,
) -> Result<ProjectSummary, DesignError> {
    let old_path = project_path(root, old_name)?;
    let new_path = project_path(root, new_name)?;
    if !old_path.exists() {
        return Err(DesignError::NotFound(old_name.to_string()));
    }
    if new_path.exists() {
        return Err(DesignError::AlreadyExists(new_name.to_string()));
    }

    fs::rename(old_path, &new_path)?;
    project_summary(&new_path)
}

pub fn delete_project(root: &Path, name: &str) -> Result<(), DesignError> {
    let path = project_path(root, name)?;
    if !path.exists() {
        return Err(DesignError::NotFound(name.to_string()));
    }

    fs::remove_dir_all(path)?;
    Ok(())
}

pub fn duplicate_project(
    root: &Path,
    source_name: &str,
    target_name: &str,
) -> Result<ProjectSummary, DesignError> {
    let source = project_path(root, source_name)?;
    let target = project_path(root, target_name)?;
    if !source.exists() {
        return Err(DesignError::NotFound(source_name.to_string()));
    }
    if target.exists() {
        return Err(DesignError::AlreadyExists(target_name.to_string()));
    }

    fs::create_dir(&target)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        if entry.file_type()?.is_file() && is_scene_file(&entry.path()) {
            fs::copy(entry.path(), target.join(entry.file_name()))?;
        }
    }

    project_summary(&target)
}

pub fn list_designs(root: &Path, project: &str) -> Result<Vec<DesignSummary>, DesignError> {
    let project_dir = project_path(root, project)?;
    if !project_dir.exists() {
        return Err(DesignError::NotFound(project.to_string()));
    }

    let mut designs = fs::read_dir(&project_dir)?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_file())
        .filter(|entry| is_scene_file(&entry.path()))
        .map(|entry| {
            let file_name = entry.file_name().to_string_lossy().to_string();
            Ok(DesignSummary {
                project: project.to_string(),
                name: design_name_from_file(&file_name),
                file_name,
                updated_at_ms: modified_ms(&entry.path()),
            })
        })
        .collect::<Result<Vec<_>, DesignError>>()?;
    designs.sort_by(|a, b| b.updated_at_ms.cmp(&a.updated_at_ms));
    Ok(designs)
}

pub fn create_design(root: &Path, project: &str, name: &str) -> Result<DesignScene, DesignError> {
    let path = design_path(root, project, name)?;
    if path.exists() {
        return Err(DesignError::AlreadyExists(name.to_string()));
    }

    let content = empty_scene();
    write_design(
        root,
        project,
        path.file_name().unwrap().to_string_lossy().as_ref(),
        &content,
    )
}

pub fn read_design(root: &Path, project: &str, file_name: &str) -> Result<DesignScene, DesignError> {
    let path = design_path(root, project, file_name)?;
    if !path.exists() {
        return Err(DesignError::NotFound(file_name.to_string()));
    }

    let content: Value = serde_json::from_str(&fs::read_to_string(&path)?)?;
    validate_scene(&content)?;
    let file_name = path.file_name().unwrap().to_string_lossy().to_string();
    Ok(DesignScene {
        project: project.to_string(),
        name: design_name_from_file(&file_name),
        file_name,
        content,
    })
}

pub fn write_design(
    root: &Path,
    project: &str,
    file_name: &str,
    content: &Value,
) -> Result<DesignScene, DesignError> {
    validate_scene(content)?;
    let path = design_path(root, project, file_name)?;
    let parent = path
        .parent()
        .ok_or_else(|| DesignError::InvalidName(file_name.to_string()))?;
    if !parent.exists() {
        return Err(DesignError::NotFound(project.to_string()));
    }

    let tmp_path = path.with_extension(format!("{EXTENSION}.tmp"));
    fs::write(&tmp_path, serde_json::to_string_pretty(content)?)?;
    fs::rename(&tmp_path, &path)?;
    read_design(root, project, path.file_name().unwrap().to_string_lossy().as_ref())
}

pub fn rename_design(
    root: &Path,
    project: &str,
    old_file_name: &str,
    new_name: &str,
) -> Result<DesignSummary, DesignError> {
    let old_path = design_path(root, project, old_file_name)?;
    let new_path = design_path(root, project, new_name)?;
    if !old_path.exists() {
        return Err(DesignError::NotFound(old_file_name.to_string()));
    }
    if new_path.exists() {
        return Err(DesignError::AlreadyExists(new_name.to_string()));
    }

    fs::rename(old_path, &new_path)?;
    let file_name = new_path.file_name().unwrap().to_string_lossy().to_string();
    Ok(DesignSummary {
        project: project.to_string(),
        name: design_name_from_file(&file_name),
        file_name,
        updated_at_ms: modified_ms(&new_path),
    })
}

pub fn duplicate_design(
    root: &Path,
    project: &str,
    source_file_name: &str,
    target_name: &str,
) -> Result<DesignSummary, DesignError> {
    let source = design_path(root, project, source_file_name)?;
    let target = design_path(root, project, target_name)?;
    if !source.exists() {
        return Err(DesignError::NotFound(source_file_name.to_string()));
    }
    if target.exists() {
        return Err(DesignError::AlreadyExists(target_name.to_string()));
    }

    fs::copy(&source, &target)?;
    let file_name = target.file_name().unwrap().to_string_lossy().to_string();
    Ok(DesignSummary {
        project: project.to_string(),
        name: design_name_from_file(&file_name),
        file_name,
        updated_at_ms: modified_ms(&target),
    })
}

pub fn import_design(
    root: &Path,
    project: &str,
    source_path: &Path,
) -> Result<DesignSummary, DesignError> {
    if !source_path.is_file() {
        return Err(DesignError::NotFound(source_path.display().to_string()));
    }

    let content: Value = serde_json::from_str(&fs::read_to_string(source_path)?)?;
    validate_scene(&content)?;

    let preferred_name = design_name_from_path(source_path)?;
    let target = unique_design_path(root, project, &preferred_name)?;
    fs::write(&target, serde_json::to_string_pretty(&content)?)?;

    let file_name = target.file_name().unwrap().to_string_lossy().to_string();
    Ok(DesignSummary {
        project: project.to_string(),
        name: design_name_from_file(&file_name),
        file_name,
        updated_at_ms: modified_ms(&target),
    })
}

pub fn export_design(
    root: &Path,
    project: &str,
    file_name: &str,
    target_path: &Path,
) -> Result<(), DesignError> {
    let source = design_path(root, project, file_name)?;
    if !source.exists() {
        return Err(DesignError::NotFound(file_name.to_string()));
    }

    let content: Value = serde_json::from_str(&fs::read_to_string(&source)?)?;
    validate_scene(&content)?;

    if let Some(parent) = target_path.parent() {
        if !parent.exists() {
            return Err(DesignError::NotFound(parent.display().to_string()));
        }
    }

    fs::write(target_path, serde_json::to_string_pretty(&content)?)?;
    Ok(())
}

pub fn delete_design(root: &Path, project: &str, file_name: &str) -> Result<(), DesignError> {
    let path = design_path(root, project, file_name)?;
    if !path.exists() {
        return Err(DesignError::NotFound(file_name.to_string()));
    }

    fs::remove_file(path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_root(label: &str) -> PathBuf {
        let stamp = std::time::SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("banguesesdraw-{label}-{stamp}"))
    }

    #[test]
    fn creates_and_lists_projects() {
        let root = test_root("projects");
        let project = create_project(&root, "Client Sketches").unwrap();
        assert_eq!(project.name, "Client Sketches");
        assert_eq!(project.design_count, 0);

        let projects = list_projects(&root).unwrap();
        assert_eq!(projects, vec![project]);

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_path_traversal_names() {
        let root = test_root("traversal");
        let err = create_project(&root, "../bad").unwrap_err();
        assert!(matches!(err, DesignError::InvalidName(_)));
    }

    #[test]
    fn refuses_project_name_conflicts() {
        let root = test_root("conflict");
        create_project(&root, "Plans").unwrap();
        let err = create_project(&root, "Plans").unwrap_err();
        assert!(matches!(err, DesignError::AlreadyExists(_)));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn renames_duplicates_and_deletes_projects() {
        let root = test_root("project-lifecycle");
        create_project(&root, "Original").unwrap();
        create_design(&root, "Original", "Home").unwrap();

        let duplicated = duplicate_project(&root, "Original", "Original Copy").unwrap();
        assert_eq!(duplicated.name, "Original Copy");
        assert_eq!(duplicated.design_count, 1);
        assert!(root.join("Original Copy").join("Home.excalidraw").exists());

        let renamed = rename_project(&root, "Original Copy", "Archive").unwrap();
        assert_eq!(renamed.name, "Archive");
        assert_eq!(renamed.design_count, 1);
        assert!(!root.join("Original Copy").exists());
        assert!(root.join("Archive").exists());

        delete_project(&root, "Archive").unwrap();
        let projects = list_projects(&root).unwrap();
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "Original");

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn creates_reads_writes_and_lists_designs() {
        let root = test_root("designs");
        create_project(&root, "App").unwrap();
        let created = create_design(&root, "App", "First Flow").unwrap();
        assert_eq!(created.file_name, "First Flow.excalidraw");
        assert_eq!(created.content["type"], "excalidraw");

        let updated = json!({
            "type": "excalidraw",
            "version": 2,
            "source": "test",
            "elements": [{"id": "box-1", "type": "rectangle"}],
            "appState": {},
            "files": {}
        });
        write_design(&root, "App", "First Flow.excalidraw", &updated).unwrap();

        let read = read_design(&root, "App", "First Flow.excalidraw").unwrap();
        assert_eq!(read.content["elements"][0]["id"], "box-1");

        let designs = list_designs(&root, "App").unwrap();
        assert_eq!(designs.len(), 1);
        assert_eq!(designs[0].name, "First Flow");

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_design_name_conflicts() {
        let root = test_root("design-conflicts");
        create_project(&root, "Ideas").unwrap();
        create_design(&root, "Ideas", "Sketch").unwrap();
        create_design(&root, "Ideas", "Other").unwrap();

        let rename_err = rename_design(&root, "Ideas", "Sketch.excalidraw", "Other").unwrap_err();
        assert!(matches!(rename_err, DesignError::AlreadyExists(_)));

        let duplicate_err = duplicate_design(&root, "Ideas", "Sketch.excalidraw", "Other").unwrap_err();
        assert!(matches!(duplicate_err, DesignError::AlreadyExists(_)));

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_invalid_scenes_on_write_and_read() {
        let root = test_root("invalid-scene");
        create_project(&root, "App").unwrap();

        let missing_app_state = json!({
            "type": "excalidraw",
            "version": 2,
            "source": "test",
            "elements": [],
            "files": {}
        });
        let write_err = write_design(&root, "App", "Broken.excalidraw", &missing_app_state).unwrap_err();
        assert!(matches!(write_err, DesignError::InvalidDesignFile(_)));

        let invalid_on_disk = json!({
            "type": "excalidraw",
            "version": 2,
            "source": "test",
            "elements": [],
            "appState": [],
            "files": {}
        });
        fs::write(
            root.join("App").join("Broken.excalidraw"),
            serde_json::to_string_pretty(&invalid_on_disk).unwrap(),
        )
        .unwrap();

        let read_err = read_design(&root, "App", "Broken.excalidraw").unwrap_err();
        assert!(matches!(read_err, DesignError::InvalidDesignFile(_)));

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn write_design_replaces_content_and_removes_temp_file() {
        let root = test_root("write-replace");
        create_project(&root, "App").unwrap();
        create_design(&root, "App", "Flow").unwrap();

        let first = json!({
            "type": "excalidraw",
            "version": 2,
            "source": "test",
            "elements": [{"id": "first", "type": "rectangle"}],
            "appState": {},
            "files": {}
        });
        write_design(&root, "App", "Flow.excalidraw", &first).unwrap();

        let second = json!({
            "type": "excalidraw",
            "version": 2,
            "source": "test",
            "elements": [{"id": "second", "type": "ellipse"}],
            "appState": {},
            "files": {}
        });
        let written = write_design(&root, "App", "Flow.excalidraw", &second).unwrap();
        assert_eq!(written.content["elements"][0]["id"], "second");
        assert!(!root.join("App").join("Flow.excalidraw.tmp").exists());

        let raw = fs::read_to_string(root.join("App").join("Flow.excalidraw")).unwrap();
        assert!(raw.contains("\"second\""));
        assert!(!raw.contains("\"first\""));

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn duplicate_project_ignores_non_scene_files() {
        let root = test_root("duplicate-project-filter");
        create_project(&root, "Source").unwrap();
        create_design(&root, "Source", "Scene").unwrap();
        fs::write(root.join("Source").join("notes.txt"), "ignore me").unwrap();
        fs::write(root.join("Source").join("Scene.excalidraw.tmp"), "temp").unwrap();

        let duplicated = duplicate_project(&root, "Source", "Copy").unwrap();
        assert_eq!(duplicated.design_count, 1);
        assert!(root.join("Copy").join("Scene.excalidraw").exists());
        assert!(!root.join("Copy").join("notes.txt").exists());
        assert!(!root.join("Copy").join("Scene.excalidraw.tmp").exists());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rename_duplicate_and_delete_designs_preserve_originals() {
        let root = test_root("rename-duplicate");
        create_project(&root, "Ideas").unwrap();
        create_design(&root, "Ideas", "Sketch").unwrap();

        let renamed = rename_design(&root, "Ideas", "Sketch.excalidraw", "Sketch v2").unwrap();
        assert_eq!(renamed.file_name, "Sketch v2.excalidraw");

        let duplicated = duplicate_design(&root, "Ideas", "Sketch v2.excalidraw", "Copy").unwrap();
        assert_eq!(duplicated.file_name, "Copy.excalidraw");

        delete_design(&root, "Ideas", "Copy.excalidraw").unwrap();
        let designs = list_designs(&root, "Ideas").unwrap();
        assert_eq!(designs.len(), 1);
        assert_eq!(designs[0].file_name, "Sketch v2.excalidraw");

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn exports_a_design_to_a_chosen_path() {
        let root = test_root("export");
        let target = root.join("Flow Export.excalidraw");
        create_project(&root, "App").unwrap();

        let scene = json!({
            "type": "excalidraw",
            "version": 2,
            "source": "test",
            "elements": [{"id": "box-1", "type": "rectangle"}],
            "appState": {},
            "files": {}
        });
        write_design(&root, "App", "Flow.excalidraw", &scene).unwrap();

        export_design(&root, "App", "Flow.excalidraw", &target).unwrap();

        let exported: Value = serde_json::from_str(&fs::read_to_string(&target).unwrap()).unwrap();
        assert_eq!(exported["elements"][0]["id"], "box-1");

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn imports_a_design_into_the_selected_project_with_a_conflict_safe_name() {
        let root = test_root("import");
        let external_root = test_root("external-import");
        fs::create_dir_all(&external_root).unwrap();
        create_project(&root, "App").unwrap();
        create_design(&root, "App", "Flow").unwrap();

        let source = external_root.join("Flow.excalidraw");
        let scene = json!({
            "type": "excalidraw",
            "version": 2,
            "source": "test",
            "elements": [{"id": "imported", "type": "ellipse"}],
            "appState": {},
            "files": {}
        });
        fs::write(&source, serde_json::to_string_pretty(&scene).unwrap()).unwrap();

        let imported = import_design(&root, "App", &source).unwrap();

        assert_eq!(imported.name, "Flow Copy");
        assert_eq!(imported.file_name, "Flow Copy.excalidraw");
        let read = read_design(&root, "App", &imported.file_name).unwrap();
        assert_eq!(read.content["elements"][0]["id"], "imported");

        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(external_root).unwrap();
    }

    #[test]
    fn rejects_invalid_import_files() {
        let root = test_root("invalid-import");
        let external_root = test_root("invalid-external-import");
        fs::create_dir_all(&external_root).unwrap();
        create_project(&root, "App").unwrap();

        let source = external_root.join("Broken.excalidraw");
        fs::write(&source, "{\"type\":\"not-excalidraw\"}").unwrap();

        let err = import_design(&root, "App", &source).unwrap_err();
        assert!(matches!(err, DesignError::InvalidDesignFile(_)));

        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(external_root).unwrap();
    }
}
