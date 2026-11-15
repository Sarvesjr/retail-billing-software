import * as settingsService from '../services/settingsService.js';

export async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getAllSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const updated = await settingsService.updateSettings(req.body);
    res.json({ success: true, message: 'Settings saved successfully', data: updated });
  } catch (error) {
    next(error);
  }
}

export async function resetData(req, res, next) {
  try {
    const wipeProducts = Boolean(req.body.wipeProducts);
    const result = await settingsService.resetFabricatedData({ wipeProducts });
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

export async function downloadBackup(req, res, next) {
  try {
    const sqlDump = await settingsService.generateSqlBackup();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `retailbilling_backup_${dateStr}.sql`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(sqlDump);
  } catch (error) {
    next(error);
  }
}

