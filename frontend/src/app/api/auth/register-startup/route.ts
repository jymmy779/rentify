import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      startupName,
      businessType,
      activationCode,
    } = await req.json();

    if (!email || !password || !fullName || !phone || !startupName || !businessType) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải từ 6 ký tự trở lên.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Thiếu cấu hình Supabase trên server.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const isBypass = activationCode?.trim().toUpperCase() === 'RENTIFY_PREMIUM_2026';
    const tenantStatus = isBypass ? 'active' : 'pending';
    const userRole = isBypass ? 'owner' : 'pending_owner';

    const { data: createdUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
      },
    });

    if (createUserError || !createdUserData.user) {
      if (createUserError?.status === 422 || createUserError?.code === 'email_exists') {
        return NextResponse.json({ error: 'Email này đã được đăng ký trong hệ thống.' }, { status: 409 });
      }

      return NextResponse.json(
        { error: createUserError?.message || 'Lỗi khi tạo tài khoản.' },
        { status: 500 }
      );
    }

    const userId = createdUserData.user.id;

    const { error: tenantError } = await supabaseAdmin.from('tenants').insert({
      id: userId,
      name: startupName,
      phone,
      business_type: businessType,
      status: tenantStatus,
    });

    if (tenantError) {
      return NextResponse.json(
        { error: tenantError.message || 'Không thể tạo thông tin Startup.' },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      full_name: fullName,
      phone,
      role: userRole,
      tenant_id: userId,
    });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || 'Không thể cập nhật hồ sơ người dùng.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Register Startup] 💥 Lỗi hệ thống:', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}