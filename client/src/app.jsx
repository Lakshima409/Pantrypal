import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Home from './pages/Home';
import RecipeSearchClean from './pages/RecipeSearchClean';
import RecipeDetails from './pages/RecipeDetails';
import MealPlanClean from './pages/MealPlanClean';
import ShoppingListClean from './pages/ShoppingListClean';
import FavoritesClean from './pages/FavoritesClean';
import ProfileClean from './pages/ProfileClean';
import CompleteProfile from './pages/CompleteProfile';
import RecipeGenerator from './pages/RecipeGenerator';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterStep1 from './pages/RegisterStep1';
import RegisterStep2 from './pages/RegisterStep2';
import ForgotPassword from './pages/ForgotPassword';
import RegisterStep3 from './pages/RegisterStep3';

function App() {
  return (
    <Router>
      <Routes>
        {/* Main app shell with Navbar */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/recipes" element={<RecipeSearchClean />} />
          <Route path="/recipes/:id" element={<RecipeDetails />} />
          <Route path="/mealplan" element={<MealPlanClean />} />
          <Route path="/shopping-list" element={<ShoppingListClean />} />
          <Route path="/favorites" element={<FavoritesClean />} />
          <Route path="/profile" element={<ProfileClean />} />
        </Route>

        {/* Recipe Generator — standalone page with its own navbar + footer */}
        <Route path="/recipes-generator" element={<RecipeGenerator />} />

        {/* Auth pages — each renders its own full-screen food-bg layout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/step1" element={<RegisterStep1 />} />
          <Route path="/register/step2" element={<RegisterStep2 />} />
          <Route path="/register/step3" element={<RegisterStep3 />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
