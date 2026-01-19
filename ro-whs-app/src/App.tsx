import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROProvider } from './store/ROContext';
import { Layout } from './components/Layout';
import { ROList } from './components/ROList';
import { Home } from './components/Home';

const App = () => {
    return (
        <ROProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        {/* Home Dashboard as default */}
                        <Route index element={<Home />} />

                        {/* Generic route for statuses */}
                        <Route path=":status" element={<ROList />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ROProvider>
    );
};
export default App;
