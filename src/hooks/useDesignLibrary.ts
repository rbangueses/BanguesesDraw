import { useCallback, useEffect, useMemo, useState } from "react";
import { designApi } from "../lib/designApi";
import type { DesignScene, DesignSummary, ProjectSummary } from "../types/designs";

type UseDesignLibraryResult = {
  projects: ProjectSummary[];
  designs: DesignSummary[];
  filteredDesigns: DesignSummary[];
  selectedProject: string | null;
  filter: string;
  isLoading: boolean;
  error: string | null;
  setSelectedProject: (project: string) => void;
  setFilter: (filter: string) => void;
  refresh: () => Promise<void>;
  createProject: (name: string) => Promise<ProjectSummary>;
  renameProject: (oldName: string, newName: string) => Promise<ProjectSummary>;
  duplicateProject: (sourceName: string, targetName: string) => Promise<ProjectSummary>;
  deleteProject: (name: string) => Promise<void>;
  createDesign: (name: string) => Promise<DesignScene | null>;
  renameDesign: (oldFileName: string, newName: string) => Promise<DesignSummary | null>;
  duplicateDesign: (
    sourceFileName: string,
    targetName: string,
  ) => Promise<DesignSummary | null>;
  deleteDesign: (fileName: string) => Promise<void>;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function useDesignLibrary(): UseDesignLibraryResult {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedProjects = await designApi.listProjects();
      setProjects(loadedProjects);
      setSelectedProject((current) =>
        current && loadedProjects.some((project) => project.name === current)
          ? current
          : loadedProjects[0]?.name ?? null,
      );
    } catch (loadError) {
      setProjects([]);
      setSelectedProject(null);
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDesigns = useCallback(async (project: string | null) => {
    if (!project) {
      setDesigns([]);
      return;
    }

    setError(null);

    try {
      setDesigns(await designApi.listDesigns(project));
    } catch (loadError) {
      setDesigns([]);
      setError(getErrorMessage(loadError));
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadDesigns(selectedProject);
  }, [loadDesigns, selectedProject]);

  const filteredDesigns = useMemo(() => {
    const query = filter.trim().toLowerCase();

    if (!query) {
      return designs;
    }

    return designs.filter((design) => design.name.toLowerCase().includes(query));
  }, [designs, filter]);

  const withProject = useCallback(
    async <T,>(callback: (project: string) => Promise<T>) => {
      if (!selectedProject) {
        return null;
      }

      setError(null);

      try {
        return await callback(selectedProject);
      } catch (actionError) {
        setError(getErrorMessage(actionError));
        throw actionError;
      }
    },
    [selectedProject],
  );

  return {
    projects,
    designs,
    filteredDesigns,
    selectedProject,
    filter,
    isLoading,
    error,
    setSelectedProject,
    setFilter,
    refresh: loadProjects,
    createProject: async (name) => {
      setError(null);
      const project = await designApi.createProject(name);
      await loadProjects();
      setSelectedProject(project.name);
      return project;
    },
    renameProject: async (oldName, newName) => {
      setError(null);
      const project = await designApi.renameProject(oldName, newName);
      await loadProjects();
      setSelectedProject(project.name);
      return project;
    },
    duplicateProject: async (sourceName, targetName) => {
      setError(null);
      const project = await designApi.duplicateProject(sourceName, targetName);
      await loadProjects();
      return project;
    },
    deleteProject: async (name) => {
      setError(null);
      await designApi.deleteProject(name);
      await loadProjects();
    },
    createDesign: async (name) =>
      withProject(async (project) => {
        const design = await designApi.createDesign(project, name);
        await loadDesigns(project);
        return design;
      }),
    renameDesign: async (oldFileName, newName) =>
      withProject(async (project) => {
        const design = await designApi.renameDesign(project, oldFileName, newName);
        await loadDesigns(project);
        return design;
      }),
    duplicateDesign: async (sourceFileName, targetName) =>
      withProject(async (project) => {
        const design = await designApi.duplicateDesign(
          project,
          sourceFileName,
          targetName,
        );
        await loadDesigns(project);
        return design;
      }),
    deleteDesign: async (fileName) => {
      await withProject(async (project) => {
        await designApi.deleteDesign(project, fileName);
        await loadDesigns(project);
      });
    },
  };
}
