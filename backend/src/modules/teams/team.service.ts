import { prisma } from "../../config/database";

export function createTeam(data: { name: string; description?: string }) {
  return prisma.team.create({
    data: {
      name: data.name,
      description: data.description,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              designation: true,
            },
          },
        },
      },
      projects: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              referenceNumber: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

export function listTeams() {
  return prisma.team.findMany({
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              designation: true,
            },
          },
        },
      },
      projects: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              referenceNumber: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getTeam(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              designation: true,
            },
          },
        },
      },
      projects: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              referenceNumber: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

export function updateTeam(teamId: string, data: { name?: string; description?: string }) {
  return prisma.team.update({
    where: { id: teamId },
    data: {
      name: data.name,
      description: data.description,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              designation: true,
            },
          },
        },
      },
      projects: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              referenceNumber: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

export function deleteTeam(teamId: string) {
  return prisma.team.delete({
    where: { id: teamId },
  });
}

export function addTeamMember(teamId: string, userId: string, role?: string) {
  return prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
    update: {
      role: role || "member",
    },
    create: {
      teamId,
      userId,
      role: role || "member",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
        },
      },
    },
  });
}

export function removeTeamMember(teamId: string, userId: string) {
  return prisma.teamMember.delete({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });
}

// ProjectTeam: Assign team to project
export function assignTeamToProject(teamId: string, projectId: string) {
  return prisma.projectTeam.upsert({
    where: {
      projectId_teamId: {
        projectId,
        teamId,
      },
    },
    update: {},
    create: {
      teamId,
      projectId,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          referenceNumber: true,
        },
      },
    },
  });
}

// ProjectTeam: Remove team from project
export function removeTeamFromProject(teamId: string, projectId: string) {
  return prisma.projectTeam.delete({
    where: {
      projectId_teamId: {
        projectId,
        teamId,
      },
    },
  });
}

// List teams assigned to a project
export function listProjectTeams(projectId: string) {
  return prisma.projectTeam.findMany({
    where: { projectId },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
