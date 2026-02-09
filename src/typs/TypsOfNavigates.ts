// typs/Sections.ts



interface Types  {
    ACTIVE: String,
    HIDDEN: String,
    ARCHIVED: String,
}

const ProjectSection :Types = {
    ACTIVE: 'active_project',
    HIDDEN: 'hidden_projects',
    ARCHIVED: 'archived_projects',
}

export default ProjectSection