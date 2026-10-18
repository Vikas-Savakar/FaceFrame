import { createRoot } from 'react-dom/client';
import App from './App';
import { SectionBoundary } from './components/AsyncState';
import './styles.css';
import './interface.css';
createRoot(document.getElementById('root')!).render(<SectionBoundary><App/></SectionBoundary>);
