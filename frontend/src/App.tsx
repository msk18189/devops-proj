import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import { MainLayout } from './layouts/MainLayout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { BrowsePage } from './pages/BrowsePage.tsx';
import { SearchPage } from './pages/SearchPage.tsx';
import { VideoDetailPage } from './pages/VideoDetailPage.tsx';
import { UploadPage } from './pages/UploadPage.tsx';
import { MyVideosPage } from './pages/MyVideosPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { Video } from './types/index.ts';

function AppContent() {
  const { user, isLoading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [browseCategory, setBrowseCategory] = useState<string>('All');

  // Synchronize router state with browser path
  const parsePath = (path: string) => {
    const cleanPath = path.replace(/\/$/, '') || '/';

    if (cleanPath === '/') return { view: 'home' };
    if (cleanPath === '/browse') return { view: 'browse' };
    if (cleanPath === '/search') return { view: 'search' };
    if (cleanPath === '/upload') return { view: 'upload' };
    if (cleanPath === '/my-videos') return { view: 'my-videos' };
    if (cleanPath === '/profile') return { view: 'profile' };
    if (cleanPath === '/admin') return { view: 'admin' };
    if (cleanPath === '/login') return { view: 'login' };
    if (cleanPath === '/register') return { view: 'register' };

    const videoMatch = cleanPath.match(/^\/video\/(\d+)$/);
    if (videoMatch) {
      return { view: 'video-detail', videoId: parseInt(videoMatch[1], 10) };
    }

    return { view: '404' };
  };

  useEffect(() => {
    // Initial path resolution
    const route = parsePath(window.location.pathname);
    setCurrentView(route.view);
    if (route.videoId) {
      setSelectedVideoId(route.videoId);
    }

    // Handle browser back / forward navigation
    const handlePopState = () => {
      const parsed = parsePath(window.location.pathname);
      setCurrentView(parsed.view);
      if (parsed.videoId) {
        setSelectedVideoId(parsed.videoId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view: string, param?: string) => {
    setCurrentView(view);

    let path = '/';
    if (view === 'browse') {
      path = '/browse';
      if (param) setBrowseCategory(param);
    } else if (view === 'search') {
      path = '/search';
    } else if (view === 'upload') {
      path = '/upload';
    } else if (view === 'my-videos') {
      path = '/my-videos';
    } else if (view === 'profile') {
      path = '/profile';
    } else if (view === 'admin') {
      path = '/admin';
    } else if (view === 'login') {
      path = '/login';
    } else if (view === 'register') {
      path = '/register';
    } else if (view === 'video-detail' && (param || selectedVideoId)) {
      const vid = param || selectedVideoId;
      path = `/video/${vid}`;
    } else if (view === '404') {
      path = '/404';
    }

    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
    setSelectedVideoId(video.id);
    setCurrentView('video-detail');
    const path = `/video/${video.id}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateBrowseWithCategory = (category?: string) => {
    if (category) {
      setBrowseCategory(category);
    }
    navigateTo('browse', category);
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-muted)'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomePage
            onSelectVideo={handleSelectVideo}
            onNavigateBrowse={handleNavigateBrowseWithCategory}
          />
        );

      case 'browse':
        return (
          <BrowsePage
            initialCategory={browseCategory}
            onSelectVideo={handleSelectVideo}
          />
        );

      case 'search':
        return (
          <SearchPage
            onSelectVideo={handleSelectVideo}
          />
        );

      case 'video-detail':
        return (
          <VideoDetailPage
            video={selectedVideo}
            videoId={selectedVideoId}
            onSelectRelated={handleSelectVideo}
            onBack={() => navigateTo('browse')}
          />
        );

      case 'upload':
        // Protected Route
        if (!user) {
          return (
            <LoginPage
              onSuccess={() => navigateTo('upload')}
              onNavigateRegister={() => navigateTo('register')}
            />
          );
        }
        return (
          <UploadPage
            onSuccess={handleSelectVideo}
            onNavigateLogin={() => navigateTo('login')}
          />
        );

      case 'my-videos':
        // Protected Route
        if (!user) {
          return (
            <LoginPage
              onSuccess={() => navigateTo('my-videos')}
              onNavigateRegister={() => navigateTo('register')}
            />
          );
        }
        return (
          <MyVideosPage
            onSelectVideo={handleSelectVideo}
            onNavigateUpload={() => navigateTo('upload')}
          />
        );

      case 'profile':
        // Protected Route
        if (!user) {
          return (
            <LoginPage
              onSuccess={() => navigateTo('profile')}
              onNavigateRegister={() => navigateTo('register')}
            />
          );
        }
        return (
          <ProfilePage
            onNavigateMyVideos={() => navigateTo('my-videos')}
            onNavigateUpload={() => navigateTo('upload')}
          />
        );

      case 'admin':
        // Protected Admin Route
        if (!user) {
          return (
            <LoginPage
              onSuccess={() => navigateTo('admin')}
              onNavigateRegister={() => navigateTo('register')}
            />
          );
        }
        return <AdminDashboardPage onSelectVideo={handleSelectVideo} />;

      case 'login':
        return (
          <LoginPage
            onSuccess={() => navigateTo('home')}
            onNavigateRegister={() => navigateTo('register')}
          />
        );

      case 'register':
        return (
          <RegisterPage
            onSuccess={() => navigateTo('home')}
            onNavigateLogin={() => navigateTo('login')}
          />
        );

      case '404':
      default:
        return (
          <NotFoundPage
            onNavigateHome={() => navigateTo('home')}
            onNavigateBrowse={() => navigateTo('browse')}
          />
        );
    }
  };

  return (
    <MainLayout currentView={currentView} onNavigate={navigateTo}>
      {renderContent()}
    </MainLayout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
