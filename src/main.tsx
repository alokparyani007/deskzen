import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { siteRouter } from './features/site/siteRouter';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element missing');
}

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={siteRouter} />
  </StrictMode>,
);
