import React, { useState } from 'react';

const TagInput = ({ tags, setTags, placeholder = 'Add tag...', tooltip }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim().replace(/,/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="tag-input-container">
      <style>{`
        .tag-input-wrapper {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          min-height: 42px;
          align-items: center;
        }
        .tag-input-wrapper:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
        .tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--primary);
          color: white;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 0.85rem;
        }
        .tag-remove {
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
          line-height: 1;
        }
        .tag-input {
          flex: 1;
          border: none;
          background: transparent;
          color: white;
          outline: none;
          min-width: 120px;
          font-size: 0.95rem;
        }
        .tooltip-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          font-size: 10px;
          margin-left: 8px;
          cursor: help;
          position: relative;
        }
        .tooltip-text {
          visibility: hidden;
          width: 250px;
          background-color: #333;
          color: #fff;
          text-align: center;
          border-radius: 6px;
          padding: 8px;
          position: absolute;
          z-index: 1;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 12px;
          font-weight: normal;
        }
        .tooltip-icon:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <label>Recipient Emails (Optional)</label>
        {tooltip && (
          <span className="tooltip-icon">
            ?
            <span className="tooltip-text">{tooltip}</span>
          </span>
        )}
      </div>
      <div className="tag-input-wrapper">
        {tags.map((tag, index) => (
          <span key={index} className="tag animate-fade-in">
            {tag}
            <span className="tag-remove" onClick={() => removeTag(index)}>&times;</span>
          </span>
        ))}
        <input
          type="text"
          className="tag-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
        />
      </div>
    </div>
  );
};

export default TagInput;
