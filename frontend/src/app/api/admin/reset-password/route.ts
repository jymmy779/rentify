import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canResetUserPassword, isActiveRole } from '../../../../lib/permissions';

export async function POST(req: NextRequest) {
  try {
    // 1. Lấy token xác thực từ Header của Admin gửi lên
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    // Khởi tạo client có gắn JWT của người gọi để mọi truy vấn đều đi qua RLS đúng ngữ cảnh
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' }, { status: 401 });
    }

    // 2. Kiểm tra xem người gọi API này có đúng là Admin hoặc Owner trong bảng profiles không
    const { data: creatorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !creatorProfile || !isActiveRole(creatorProfile.role)) {
      return NextResponse.json({ error: 'Từ chối truy cập! Chỉ Chủ sở hữu hoặc Quản trị viên mới được thực hiện thao tác này.' }, { status: 403 });
    }

    // 3. Đọc dữ liệu gửi lên
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Thiếu thông tin User ID hoặc Mật khẩu mới.' }, { status: 400 });
    }

    // Lấy thông tin vai trò của tài khoản cần đặt lại mật khẩu
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin tài khoản cần đặt lại mật khẩu.' }, { status: 404 });
    }

    // Kiểm tra tính hợp lệ về phân cấp quyền lực khi đặt lại mật khẩu
    if (!canResetUserPassword(creatorProfile.role, targetProfile.role, user.id === userId)) {
      return NextResponse.json({ error: 'Bạn không có quyền đặt lại mật khẩu cho tài khoản này.' }, { status: 403 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải từ 6 ký tự trở lên.' }, { status: 400 });
    }

    // 4. Kiểm tra biến môi trường Service Role Key trên máy chủ
    if (!serviceRoleKey) {
      return NextResponse.json({
        error: 'Chưa cấu hình biến môi trường SUPABASE_SERVICE_ROLE_KEY trên server. Vui lòng thêm biến này vào file .env.local để kích hoạt tính năng reset mật khẩu trực tiếp.'
      }, { status: 501 });
    }

    // 5. Khởi tạo Admin Client của Supabase để có quyền cập nhật tài khoản khác
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (resetError) {
      return NextResponse.json({ error: resetError.message || 'Lỗi khi reset mật khẩu.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Đã đặt lại mật khẩu nhân viên thành công!' });

  } catch (err: any) {
    console.error('Lỗi API Reset Password:', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}
