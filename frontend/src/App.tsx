import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import GmailCallback from './pages/auth/GmailCallback';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import AICommand from './pages/AICommand';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import NotificationsCenter from './pages/Notifications';
import ActivityLog from './pages/ActivityLog';
import Mails from './pages/Mails';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import Analytics from './pages/Analytics';
import OperationsCenter from './pages/OperationsCenter';
import AutomationCenter from './pages/AutomationCenter';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import LogoutGuard from './components/LogoutGuard';
import { DatasetProvider } from './context/DatasetContext';

function App() {
    return (
        <DatasetProvider>
            <LogoutGuard>
                <Routes>
                    <Route
                        path='/'
                        element={<LandingPage />}
                    />
                    <Route
                        path='/auth/login'
                        element={<Login />}
                    />
                    <Route
                        path='/auth/signup'
                        element={<Signup />}
                    />
                    <Route
                        path='/auth/gmail-callback'
                        element={<GmailCallback />}
                    />
                    <Route
                        path='/dashboard'
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/companies'
                        element={
                            <ProtectedRoute>
                                <Companies />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/ai-command'
                        element={
                            <ProtectedRoute>
                                <AICommand />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/calendar'
                        element={
                            <ProtectedRoute>
                                <Calendar />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/tasks'
                        element={
                            <ProtectedRoute>
                                <Tasks />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/notifications'
                        element={
                            <ProtectedRoute>
                                <NotificationsCenter />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/activity'
                        element={
                            <ProtectedRoute>
                                <ActivityLog />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/mails'
                        element={
                            <ProtectedRoute>
                                <Mails />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/leads'
                        element={
                            <ProtectedRoute>
                                <Leads />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/deals'
                        element={
                            <ProtectedRoute>
                                <Deals />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/analytics'
                        element={
                            <ProtectedRoute allowedRoles={['Sales Manager', 'Administrator']}>
                                <Analytics />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/operations'
                        element={
                            <ProtectedRoute allowedRoles={['Sales Manager', 'Administrator']}>
                                <OperationsCenter />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/automation'
                        element={
                            <ProtectedRoute>
                                <AutomationCenter />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/user-management'
                        element={
                            <ProtectedRoute allowedRoles={['Administrator']}>
                                <UserManagement />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path='/settings'
                        element={
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </LogoutGuard>
        </DatasetProvider>
    );
}

export default App;
