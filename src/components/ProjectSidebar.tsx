import { Copy, Eye, EyeOff, FolderPlus, Pencil, Trash2 } from "lucide-react";
import type { ProjectSummary } from "../types/designs";

type ProjectSidebarProps = {
  projects: ProjectSummary[];
  selectedProject: string | null;
  presentationMode: boolean;
  onTogglePresentationMode: () => void;
  onSetProjectVisibility: (project: string, visible: boolean) => void;
  onSelectProject: (project: string) => void;
  onCreateProject: () => void;
  onRenameProject: (project: string) => void;
  onDuplicateProject: (project: string) => void;
  onDeleteProject: (project: string) => void;
};

function isVisibleInPresentationMode(project: ProjectSummary) {
  return project.visibleInPresentationMode === true;
}

export function ProjectSidebar({
  projects,
  selectedProject,
  presentationMode,
  onTogglePresentationMode,
  onSetProjectVisibility,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  const visibleProjects = presentationMode
    ? projects.filter(
        (project) =>
          project.name === selectedProject || isVisibleInPresentationMode(project),
      )
    : projects;
  const hiddenProjectCount = presentationMode
    ? projects.length - visibleProjects.length
    : 0;
  const presentationModeTitle = presentationMode
    ? "Stop presentation mode"
    : "Start presentation mode";

  return (
    <aside className="project-sidebar">
      <div className="sidebar-header">
        <h1>BanguesesDraw</h1>
        <div className="sidebar-header-actions">
          <button
            type="button"
            className={`icon-button ${presentationMode ? "privacy-active" : ""}`}
            onClick={onTogglePresentationMode}
            aria-label={presentationModeTitle}
            title={presentationModeTitle}
          >
            {presentationMode ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onCreateProject}
            aria-label="Create project"
            title="Create project"
          >
            <FolderPlus size={18} />
          </button>
        </div>
      </div>
      {hiddenProjectCount > 0 ? (
        <p className="privacy-hidden-count">
          {hiddenProjectCount} private{" "}
          {hiddenProjectCount === 1 ? "project" : "projects"} hidden
        </p>
      ) : null}
      <nav aria-label="Projects">
        {visibleProjects.map((project) => (
          <div
            key={project.name}
            className={
              project.name === selectedProject ? "project-item active" : "project-item"
            }
          >
            <button
              type="button"
              className="project-button"
              onClick={() => onSelectProject(project.name)}
            >
              <span>{project.name}</span>
              <span>{project.designCount}</span>
            </button>
            <div className="row-actions">
              <button
                type="button"
                className="icon-button row-action-button"
                onClick={() =>
                  onSetProjectVisibility(
                    project.name,
                    !isVisibleInPresentationMode(project),
                  )
                }
                aria-label={
                  isVisibleInPresentationMode(project)
                    ? `Hide ${project.name} in presentation mode`
                    : `Show ${project.name} in presentation mode`
                }
                title={
                  isVisibleInPresentationMode(project)
                    ? `Hide ${project.name} in presentation mode`
                    : `Show ${project.name} in presentation mode`
                }
              >
                {isVisibleInPresentationMode(project) ? (
                  <Eye size={16} />
                ) : (
                  <EyeOff size={16} />
                )}
              </button>
              <button
                type="button"
                className="icon-button row-action-button"
                onClick={() => onRenameProject(project.name)}
                aria-label={`Rename ${project.name}`}
                title={`Rename ${project.name}`}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                className="icon-button row-action-button"
                onClick={() => onDuplicateProject(project.name)}
                aria-label={`Duplicate ${project.name}`}
                title={`Duplicate ${project.name}`}
              >
                <Copy size={16} />
              </button>
              <button
                type="button"
                className="icon-button row-action-button"
                onClick={() => onDeleteProject(project.name)}
                aria-label={`Delete ${project.name}`}
                title={`Delete ${project.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
