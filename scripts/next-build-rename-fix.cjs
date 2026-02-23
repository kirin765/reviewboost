const fs = require('fs');

function normalizeError(error, src, dest) {
  if (!error || error.code !== 'EXDEV') {
    return error;
  }

  return new Promise(async (resolve, reject) => {
    try {
      await fs.promises.mkdir(require('path').dirname(dest), { recursive: true });
      await fs.promises.copyFile(src, dest);
      await fs.promises.unlink(src).catch(() => {});
      resolve();
    } catch (copyError) {
      reject(copyError);
    }
  });
}

const originalRename = fs.promises.rename;
fs.promises.rename = async (src, dest, callback) => {
  try {
    const result = await originalRename.call(fs.promises, src, dest);
    if (callback) callback();
    return result;
  } catch (error) {
    if (error && error.code === 'EXDEV') {
      try {
        await normalizeError(error, src, dest);
        if (callback) callback();
        return;
      } catch (copyError) {
        if (callback) {
          callback(copyError);
          return;
        }
        throw copyError;
      }
    }

    if (callback) {
      callback(error);
      return;
    }
    throw error;
  }
};
