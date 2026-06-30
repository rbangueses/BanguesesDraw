import { FolderPlus } from "lucide-react";
import type { ProjectSummary } from "../types/designs";

type ProjectSidebarProps = {
  projects: ProjectSummary[];
  selectedProject: string | null;
  onSelectProject: (project: string) => void;
  onCreateProject: () => void;
};

export function ProjectSidebar({
  projects,
  selectedProject,
  onSelectProject,
  onCreateProject,
}: ProjectSidebarProps) {
  return (
    <aside className="project-sidebar">
      <div className="sidebar-header">
        <h1>BanguesesDraw</h1>
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
      <nav aria-label="Projects">
        {projects.map((project) => (
          <button
            type="button"
            key={project.name}
            className={
              project.name === selectedProject
                ? "project-button active"
                : "project-button"
            }
            onClick={() => onSelectProject(project.name)}
          >
            <span>{project.name}</span>
            <span>{project.designCount}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
