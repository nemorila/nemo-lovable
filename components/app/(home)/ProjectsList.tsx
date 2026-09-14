'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProjectRow } from '@/lib/projects/store';

type ProjectSummary = Pick<ProjectRow, 'id' | 'name' | 'updated_at'>;

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just nu';
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.round(hours / 24);
  return `${days} dag${days === 1 ? '' : 'ar'} sedan`;
}

export default function ProjectsList() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success) setProjects(data.projects);
      })
      .catch((error) => console.error('[ProjectsList] Failed to load projects:', error));

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Ta bort det här projektet? Det går inte att ångra.')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProjects((prev) => prev?.filter((p) => p.id !== id) ?? null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (!projects || projects.length === 0) return null;

  return (
    <div className="w-full">
      <h2 className="text-sm font-medium text-gray-500 mb-16">Dina projekt</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-16">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex flex-col gap-12 bg-white border border-gray-200 rounded-2xl p-16 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="min-w-0">
              <p className="text-gray-900 truncate">{project.name}</p>
              <p className="text-sm text-gray-400">
                Uppdaterad {formatRelativeTime(project.updated_at)}
              </p>
            </div>
            <div className="flex items-center gap-12">
              <Link
                href={`/project/${project.id}`}
                className="text-sm text-indigo-500 hover:text-indigo-600 transition-colors"
              >
                Öppna
              </Link>
              <button
                onClick={() => handleDelete(project.id)}
                disabled={deletingId === project.id}
                className="text-sm text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
              >
                {deletingId === project.id ? 'Tar bort…' : 'Ta bort'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
