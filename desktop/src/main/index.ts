import { app, dialog, nativeTheme } from 'electron';
import { CH } from '@shared/channels';
import { applyUserDataOverride } from './runtime';
import { initSettings } from './settings';
import { emptyTrash } from './dist';
import { registerIpc } from './ipc';
import { TaskManager } from './taskManager';
import { createWindow, focusMainWindow, getMainWindow } from './window';

applyUserDataOverride();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => focusMainWindow());

  let manager: TaskManager | null = null;
  let quitting = false;

  app.whenReady().then(() => {
    initSettings();
    emptyTrash();
    manager = new TaskManager();
    registerIpc(manager);
    createWindow();

    nativeTheme.on('updated', () => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(CH.evThemeChanged, nativeTheme.shouldUseDarkColors);
      }
    });

    app.on('activate', () => {
      if (!getMainWindow()) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', (event) => {
    if (quitting || !manager) return;
    const running = manager.runningTask();
    if (!running) return;
    event.preventDefault();
    const choice = dialog.showMessageBoxSync({
      type: 'warning',
      buttons: ['取消构建并退出', '继续构建'],
      defaultId: 1,
      cancelId: 1,
      message: '有构建正在进行',
      detail: '退出将终止进程组并清理残留容器。确定退出吗？'
    });
    if (choice === 0) {
      manager.cancelRunning();
      void manager.waitIdle(12000).then(() => {
        quitting = true;
        app.quit();
      });
    }
  });
}