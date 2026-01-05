/**
 * Catmi Tutorial Configuration
 * 
 * Tập trung các cài đặt cho hệ thống hướng dẫn
 */

export const CATMI_CONFIG = {
  // Bật/tắt hệ thống hướng dẫn
  enabled: true,

  // Delay trước khi hiển thị (ms)
  showDelay: 1500,

  // Storage key
  storageKey: 'catmi_tutorial_seen_v1',

  // Version (thay đổi này để buộc re-show hướng dẫn cho tất cả)
  version: 'v1',

  // Animations
  animations: {
    enabled: true,
    duration: 300,
  },

  // Debug mode
  debug: false,

  // Giới hạn (optional)
  limits: {
    // Số lần tối đa skip per session (null = unlimited)
    maxSkips: null,
    
    // Timeout hướng dẫn (ms, null = no timeout)
    timeout: null,
  },

  // Accessibility
  accessibility: {
    focusTrap: true,
    highContrast: false,
    largeText: false,
  },
};

/**
 * Tùy chỉnh thông báo lỗi/thành công
 */
export const CATMI_MESSAGES = {
  skipWarning: 'Bạn đang bỏ qua hướng dẫn. Bấm nút "?" bất kỳ lúc nào để xem lại!',
  completedSuccess: 'Chúc mừng! Bạn đã hoàn thành hướng dẫn! 🎉',
  error: {
    gifNotFound: 'Không thể tải GIF. Vui lòng kiểm tra đường dẫn.',
  },
};

/**
 * Hooks để sử dụng config trong component
 */
export function useCatmiConfig() {
  return CATMI_CONFIG;
}

export function useCatmiMessages() {
  return CATMI_MESSAGES;
}
