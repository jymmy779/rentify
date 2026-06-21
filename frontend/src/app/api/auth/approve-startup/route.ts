import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Thiếu cấu hình Supabase trên server.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: 'Email chưa được xác nhận.' }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 404 });
    }

    if (profile.role !== 'pending_owner') {
      return NextResponse.json({ success: true, message: 'Tài khoản đã ở trạng thái hợp lệ.' });
    }

    const tenantId = profile.tenant_id || user.id;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: tenantError } = await supabaseAdmin
      .from('tenants')
      .update({ status: 'active' })
      .eq('id', tenantId);

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message || 'Không thể kích hoạt Startup.' }, { status: 500 });
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'owner', tenant_id: tenantId })
      .eq('id', user.id);

    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message || 'Không thể phê duyệt tài khoản.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Đã phê duyệt tài khoản startup.' });
  } catch (err: any) {
    console.error('[API Approve Startup] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}