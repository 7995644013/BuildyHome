import { Funnel, ChevronDown } from "lucide-react";

const roleOptions = [
  { value: "all", label: "All Roles" },
  { value: "super_admin", label: "Super Admins" },
  { value: "admin", label: "Admins" },
  { value: "project_manager", label: "Project Managers" },
  { value: "site_engineer", label: "Site Engineers" },
  { value: "client", label: "Clients" },
];

const allocationOptions = [
  { value: "none", label: "No Allocation Sort" },
  { value: "asc", label: "Lowest Load First" },
  { value: "desc", label: "Highest Load First" },
];

/**
 * Lightweight filter/sort controls for the Team / User Management view.
 * - Sort / group by role
 * - Sort by allocation load (projectCount)
 */
const UserTableFilters = ({
  roleFilter,
  allocationSort,
  onRoleChange,
  onAllocationChange,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-900/60">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-zinc-400">
        <Funnel className="w-4 h-4" />
        <span>Filters</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Sort / group by role */}
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => onRoleChange?.(e.target.value)}
            className="appearance-none text-xs pl-3 pr-8 py-1.5 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort by allocation load */}
        <div className="relative">
          <select
            value={allocationSort}
            onChange={(e) => onAllocationChange?.(e.target.value)}
            className="appearance-none text-xs pl-3 pr-8 py-1.5 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {allocationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default UserTableFilters;


