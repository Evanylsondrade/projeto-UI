import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './auth/AuthContext';
import { PetShopProvider } from './data/PetShopContext';

export default function App() {
  return (
    <AuthProvider>
      <PetShopProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </PetShopProvider>
    </AuthProvider>
  );
}
