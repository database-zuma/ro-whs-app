import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROProvider } from './store/ROContext';
import { Layout } from './components/Layout';
import { ROList } from './components/ROList';

const App = () => {
    return (
        <ROProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        {/* Redirect root to /queue */}
                        <Route index element={<Navigate to="/queue" replace />} />

                        {/* Generic route for statuses */}
                        <Route path=":status" element={<ROList />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ROProvider>
    );
};
export default App;
