import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppStore } from './store';
import { Sidebar } from './components/sidebar/Sidebar';
import { SearchModal } from './components/search/SearchModal';
import { DocumentPage } from './pages/DocumentPage';
import { CollectionPage } from './pages/CollectionPage';
import { TeamPage } from './pages/TeamPage';
import { HomePage } from './pages/HomePage';

function Layout() {
  const { searchOpen, setSearchOpen } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setSearchOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/doc/:id" element={<DocumentPage />} />
          <Route path="/collection/:id" element={<CollectionPage />} />
          <Route path="/team" element={<TeamPage />} />
        </Routes>
      </main>
      {searchOpen && <SearchModal />}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
