import { useEffect, useState } from 'react';
import { ForecastPanel } from './components/ForecastPanel';
import { Header } from './components/Header';
import { HowItWorks } from './components/HowItWorks';
import { PasteBox } from './components/PasteBox';
import { QuotePage } from './components/QuotePage';
import { TaskList } from './components/TaskList';
import { useProject } from './state/store';
import { useForecast } from './state/useForecast';

function useRoute(): string {
  const read = () => (window.location.hash.startsWith('#/quote') ? 'quote' : 'workbench');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export default function App() {
  const { project, dispatch, canSave, loadSample, reset } = useProject();
  const forecast = useForecast(project);
  const route = useRoute();

  useEffect(() => {
    document.title = route === 'quote' ? `Quote — ${project.name || 'Untitled project'}` : 'Scopecast — quote with confidence';
  }, [route, project.name]);

  if (route === 'quote') return <QuotePage project={project} forecast={forecast} dispatch={dispatch} />;

  const confirmNew = () => {
    if (project.tasks.length === 0 || window.confirm('Start a new project? The current one will be cleared from this browser.')) reset();
  };
  const confirmSample = () => {
    if (project.tasks.length === 0 || project.isSample || window.confirm('Load the sample project? The current one will be replaced.')) loadSample();
  };

  return (
    <>
      <Header project={project} dispatch={dispatch} onSample={confirmSample} onNew={confirmNew} />
      {!canSave && <p className="storage-note">This browser is not letting Scopecast save. Your work will be lost when you close the tab.</p>}
      <main className="workbench">
        <div>
          {project.tasks.length === 0 ? (
            <>
              <p className="intro">
                A single number hides the risk in a fixed-price quote. Give each task a <em>range</em>, choose how sure you want to be, and quote a price you can stand
                behind.
              </p>
              <PasteBox onPaste={(text) => dispatch({ type: 'paste', text })} onSample={loadSample} />
              <HowItWorks />
            </>
          ) : (
            <TaskList project={project} ranges={forecast.ranges} dispatch={dispatch} />
          )}
        </div>
        <ForecastPanel project={project} forecast={forecast} dispatch={dispatch} />
      </main>
    </>
  );
}
