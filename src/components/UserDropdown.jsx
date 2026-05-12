import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, User as UserIcon, ChevronDown } from 'lucide-react';

const UserDropdown = ({ username, onLogout, onSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const initials = username ? username.charAt(0).toUpperCase() : '?';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="user-dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <style>{`
        .user-dropdown-container {
          display: flex;
          align-items: center;
        }
        .avatar-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
        }
        .avatar-trigger:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .avatar-circle {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--primary), #ec4899);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
        }
        .dropdown-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 180px;
          background: #1a1a24;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          z-index: 100;
          animation: dropdownSlide 0.2s ease-out;
        }
        @keyframes dropdownSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          color: var(--text-muted);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }
        .dropdown-item.logout {
          color: #ef4444;
        }
        .dropdown-item.logout:hover {
          background: rgba(239, 68, 68, 0.1);
        }
        .divider {
          height: 1px;
          background: var(--border);
          margin: 6px 0;
        }
      `}</style>

      <div className="avatar-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="avatar-circle">{initials}</div>
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{username}</span>
        <ChevronDown size={14} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-item" onClick={() => { setIsOpen(false); onSettings(); }}>
            <Settings size={16} />
            Settings
          </div>
          <div className="divider" />
          <div className="dropdown-item logout" onClick={() => { setIsOpen(false); onLogout(); }}>
            <LogOut size={16} />
            Logout
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
