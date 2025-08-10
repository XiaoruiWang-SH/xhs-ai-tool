import React from 'react';
import redNoteIcon from '../assets/redNote_icon.svg';
import settingIcon from '../assets/setting_icon.svg';

interface HeaderProps {
  onSettingsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
}) => {

  return (
    <div className="flex items-center justify-between px-3 bg-white border-b-[0.5px] border-b-gray-300">
      <div className="flex justify-between items-center gap-1.5">
        <img className="w-12 h-12" src={redNoteIcon} alt="red note icon" />
        <div className='pt-[7px] text-gray-700'>AI小助手</div>
      </div>

      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          className="bg-transparent border-neutral-300 rounded-full w-7 h-7 cursor-pointer flex items-center justify-center hover:bg-neutral-50 transition-colors"
          title="设置"
          aria-label="Open settings"
        >
          {/* <span className="text-xs">⚙️</span> */}
          <img className="w-4 h-4" src={settingIcon} alt="settings icon" />

        </button>
      )}
    </div>
  );
};
