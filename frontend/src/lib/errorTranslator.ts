/**
 * Dịch các thông báo lỗi tiếng Anh từ Supabase Auth và API sang tiếng Việt thân thiện với người dùng.
 */
export const translateAuthError = (message: string | undefined | null): string => {
  if (!message) return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại!';
  
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('invalid login credentials')) {
    return 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!';
  }
  if (lowerMsg.includes('email not confirmed')) {
    return 'Địa chỉ email này chưa được xác nhận. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản!';
  }
  if (lowerMsg.includes('user not found') || lowerMsg.includes('user_not_found')) {
    return 'Không tìm thấy tài khoản người dùng với email đã nhập.';
  }
  if (lowerMsg.includes('password should be at least')) {
    return 'Mật khẩu phải chứa ít nhất 6 ký tự.';
  }
  if (lowerMsg.includes('signup requires a valid password')) {
    return 'Mật khẩu đăng ký không hợp lệ.';
  }
  if (lowerMsg.includes('email rate limit exceeded') || lowerMsg.includes('rate limit')) {
    return 'Tần suất gửi yêu cầu quá nhanh. Vui lòng thử lại sau vài phút!';
  }
  if (lowerMsg.includes('too many requests')) {
    return 'Hệ thống đang quá tải hoặc bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút!';
  }
  if (lowerMsg.includes('user already registered') || lowerMsg.includes('user_already_exists') || lowerMsg.includes('already exists')) {
    return 'Email này đã được đăng ký trên hệ thống.';
  }
  if (lowerMsg.includes('invalid email address') || lowerMsg.includes('email is invalid')) {
    return 'Địa chỉ email không đúng định dạng.';
  }
  if (lowerMsg.includes('new password should be different')) {
    return 'Mật khẩu mới phải khác với mật khẩu cũ.';
  }
  if (lowerMsg.includes('token has expired') || lowerMsg.includes('token_expired')) {
    return 'Mã xác thực đã hết hạn hoặc không hợp lệ. Vui lòng gửi yêu cầu mới!';
  }
  if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('network request failed')) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn!';
  }
  if (lowerMsg.includes('invalid grant') || lowerMsg.includes('invalid_grant')) {
    return 'Mã xác thực không hợp lệ hoặc đã hết hạn.';
  }

  // Mặc định trả về thông báo lỗi gốc hoặc một thông báo chung nếu là tiếng Anh
  return message;
};
