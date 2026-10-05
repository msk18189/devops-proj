import { useState } from 'react';
import { AuthProvider } from './hooks/useAuth.tsx';
import { MainLayout } from './layouts/MainLayout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { VideoDetailPage } from './pages/VideoDetailPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { Video } from './types/index.ts';

export function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
    setCurrentView('video-detail');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'login':
        return (
          <LoginPage
            onSuccess={() => setCurrentView('home')}
            onNavigateRegister={() => setCurrentView('register')}
          />
        );
      case 'register':
        return (
          <RegisterPage
            onSuccess={() => setCurrentView('home')}
            onNavigateLogin={() => setCurrentView('login')}
          />
        );
      case 'video-detail':
        return selectedVideo ? (
          <VideoDetailPage
            video={selectedVideo}
            onBack={() => {
              setSelectedVideo(null);
              setCurrentView('home');
            }}
          />
        ) : (
          <HomePage onSelectVideo={handleSelectVideo} />
        );
      case 'profile':
        return <ProfilePage />;
      case 'home':
      default:
        return <HomePage onSelectVideo={handleSelectVideo} />;
    }
  };

  return (
    <AuthProvider>
      <MainLayout currentView={currentView} onNavigate={(view) => setCurrentView(view)}>
        {renderContent()}
      </MainLayout>
    </AuthProvider>
  );
}

export default App;
