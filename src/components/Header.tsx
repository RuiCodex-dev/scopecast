import type { Dispatch } from 'react';
import type { Action } from '../state/store';
import type { Project } from '../state/types';
import { ArrowRightIcon, Mark } from './icons';

interface Props {
  project: Project;
  dispatch: Dispatch<Action>;
  onSample: () => void;
  onNew: () => void;
}

export function Header({ project, dispatch, onSample, onNew }: Props) {
  return (
    <header className="header">
      <a className="wordmark" href="#/" aria-label="Scopecast home">
        <Mark />
        Scopecast
      </a>
      <div className="project-ident">
        <input
          className="inline-input project-name"
          aria-label="Project name"
          value={project.name}
          onChange={(e) => dispatch({ type: 'setField', field: 'name', value: e.target.value })}
        />
        <span className="project-for">for</span>
        <input
          className="inline-input project-client"
          aria-label="Client name"
          placeholder="client name"
          value={project.client}
          onChange={(e) => dispatch({ type: 'setField', field: 'client', value: e.target.value })}
        />
        {project.isSample && <span className="sample-tag" title="Fictional sample data">Sample</span>}
      </div>
      <div className="header-actions">
        <button type="button" className="btn btn-quiet" onClick={onSample}>
          Sample
        </button>
        <button type="button" className="btn btn-quiet" onClick={onNew}>
          New
        </button>
        <a className="btn btn-primary" href="#/quote" style={{ textDecoration: 'none' }}>
          Client quote <ArrowRightIcon />
        </a>
      </div>
    </header>
  );
}
