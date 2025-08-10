/**
 * 图片处理工具函数
 * 提供图片压缩、转换等功能
 */

/**
 * 压缩图片并转换为Base64格式 (用于用户上传的文件)
 * @param file - 要处理的图片文件
 * @param maxWidth - 最大宽度，默认800px
 * @param maxHeight - 最大高度，默认600px
 * @param quality - JPEG压缩质量，默认0.7
 * @returns Promise<string> - Base64格式的压缩图片
 */
export const compressImageToBase64 = (
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.7
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // 计算缩放比例，保持宽高比
      if (width > height) {
        if (width > maxWidth) {
          height = height * (maxWidth / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = width * (maxHeight / height);
          height = maxHeight;
        }
      }

      // 设置canvas尺寸
      canvas.width = width;
      canvas.height = height;

      // 绘制压缩后的图片
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为Base64，设置压缩质量
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => reject(new Error('Image load failed'));
    
    // 使用FileReader读取文件
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 将HTMLImageElement转换为Base64格式 (用于页面中已存在的图片元素)
 * @param imgElement - HTML图片元素
 * @param quality - JPEG压缩质量，默认0.8
 * @returns Promise<string> - Base64格式的图片
 */
export const convertImageElementToBase64 = (
  imgElement: HTMLImageElement,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // 确保图片已加载
      if (imgElement.complete) {
        canvas.width = imgElement.naturalWidth || imgElement.width;
        canvas.height = imgElement.naturalHeight || imgElement.height;
        ctx.drawImage(imgElement, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        imgElement.onload = () => {
          canvas.width = imgElement.naturalWidth || imgElement.width;
          canvas.height = imgElement.naturalHeight || imgElement.height;
          ctx.drawImage(imgElement, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        imgElement.onerror = () => reject(new Error('Image load failed'));
      }
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 移除Base64数据URL中的前缀，只保留编码部分
 * @param dataUrl - 完整的data URL (如: data:image/jpeg;base64,/9j/4AAQ...)
 * @returns string - 纯Base64编码字符串
 */
export const stripBase64Prefix = (dataUrl: string): string => {
  if (dataUrl.startsWith('data:')) {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex !== -1) {
      return dataUrl.substring(commaIndex + 1);
    }
  }
  return dataUrl;
};

/**
 * 批量处理图片文件并转换为压缩的Base64格式
 * @param files - 文件列表
 * @param maxWidth - 最大宽度
 * @param maxHeight - 最大高度
 * @param quality - 压缩质量
 * @returns Promise<string[]> - Base64格式的图片数组
 */
export const batchCompressImages = async (
  files: File[],
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.7
): Promise<string[]> => {
  const imagePromises = files.map(file => 
    compressImageToBase64(file, maxWidth, maxHeight, quality)
  );
  return Promise.all(imagePromises);
};