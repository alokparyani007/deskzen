import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../../lib/settings/defaults';
import { SettingsView, type SettingsViewProps } from './SettingsView';

function render(props: Partial<SettingsViewProps> = {}): string {
  const full: SettingsViewProps = {
    settings: { ...defaultSettings, name: 'Maya' },
    onUpdate: () => {},
    onConfirmStyle: () => {},
    cameras: [],
    cameraId: '',
    onSelectCamera: () => {},
    sittingSaved: true,
    standingSaved: false,
    profiles: [],
    activeProfileId: 'home',
    onSelectProfile: () => {},
    notification: 'default',
    onToggleNotifications: () => {},
    onPlaySample: () => {},
    onExport: () => {},
    onDeleteAll: () => {},
    onReset: () => {},
    version: '0.1.0',
    ...props,
  };
  return renderToString(createElement(MemoryRouter, null, createElement(SettingsView, full))).replace(/<!-- -->/g, '');
}

describe('settings page', () => {
  it('renders every group', () => {
    const html = render();
    for (const text of ['You', 'Camera and posture', 'Coaching voice and sound', 'Notifications', 'Privacy and data', 'Reset', 'About']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('value="Maya"');
    expect(html).toContain('Voice tips');
    expect(html).toContain('Gentle chime');
    expect(html).toContain('Screen distance alerts');
    expect(html).toContain('Your camera stays on this device');
    expect(html).toContain('Photos and video are never saved or uploaded.');
    expect(html).toContain('DeskZen 0.1.0');
    expect(html).toContain('DeskZen is a wellness tool, not a medical device.');
    expect(html).not.toContain('Floating mini widget');
    expect(html).not.toContain('>Sound<');
  });

  it('shows auto-detect only for Sit and stand', () => {
    expect(render()).not.toContain('Auto-detect sitting or standing');
    expect(render({ settings: { ...defaultSettings, workStyle: 'mixed' } })).toContain('Auto-detect sitting or standing');
  });

  it('includes confirm dialogs that say it cannot be undone', () => {
    const html = render();
    expect(html).toContain('Reset all settings?');
    expect(html).toContain('Delete all your data?');
    expect(html).toContain("You can&#x27;t undo this.");
  });

  it('shows the notification permission status', () => {
    expect(render({ notification: 'denied' })).toContain('Blocked. Allow DeskZen in your browser settings.');
    expect(render({ notification: 'granted' })).toContain('Allowed in this browser');
  });
});
