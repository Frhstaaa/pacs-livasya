import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [appName, setAppName] = useState('DICOM PACS');
  const [appLogo, setAppLogo] = useState(null);

  const fetchAppSettings = async () => {
    try {
      const response = await axios.get('/app/settings');
      if (response.data) {
        setAppName(response.data.app_name || 'DICOM PACS');
        setAppLogo(response.data.app_logo || null);
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
  };

  useEffect(() => {
    fetchAppSettings();
  }, []);

  return (
    <AppContext.Provider value={{ appName, appLogo, refreshSettings: fetchAppSettings }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
