import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepository } from '../../context/RepositoryContext';
import { FolderGit2, Upload, AlertCircle, ArrowRight } from 'lucide-react';

interface NoRepoSelectedProps {
  moduleName?: string;
  description?: string;
}

export const NoRepoSelected: React.FC<NoRepoSelectedProps> = ({
  moduleName = 'Repository Analysis',
  description = 'Deterministic analysis requires an active repository sandbox. Select an ingested repository or upload a new repository ZIP archive.',
}) => {
  const navigate = useNavigate();
  const { repositories, selectRepo } = useRepository();

  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-lg">
      <div className="mb-4 rounded-2xl bg-indigo-500/10 p-4 text-indigo-400 border border-indigo-500/20">
        <FolderGit2 className="h-10 w-10" />
      </div>

      <h3 className="text-xl font-bold text-slate-100">{moduleName} &mdash; No Active Repository</h3>
      <p className="mt-2 max-w-lg text-sm text-slate-400 leading-relaxed">
        {description}
      </p>

      {repositories.length > 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-sm">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Existing Repository:
          </label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                selectRepo(e.target.value);
              }
            }}
            defaultValue=""
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="" disabled>Choose an ingested repository...</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name} ({repo.fileCount} files) - {repo.status}
              </option>
            ))}
          </select>

          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span>or</span>
            <button
              onClick={() => navigate('/repositories')}
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <span>upload a new ZIP</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Zero repositories found in sandbox. Ingest a repository to begin analysis.</span>
          </div>
          <button
            onClick={() => navigate('/repositories')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition shadow"
          >
            <Upload className="h-4 w-4" />
            <span>Go to Repository Ingestion</span>
          </button>
        </div>
      )}
    </div>
  );
};
