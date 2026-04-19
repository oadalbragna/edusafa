import React from 'react';
import TelegramBridge from '../../../TelegramBridge';
import { useNavigate } from 'react-router-dom';

const TelegramBridgePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <TelegramBridge onBack={() => navigate('/admin')} />
    </div>
  );
};

export default TelegramBridgePage;
