import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  canDeleteUser,
  canEditUserProfile,
  canSetUserRole,
  isActiveRole
} from '../../../../lib/permissions';

const buildAuthClient = (supabaseUrl: string, supabaseAnonKey: string, token: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: { persistSession: false }
  });
};

const getAdminClient = (supabaseUrl: string, serviceRoleKey: string) => {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const supabase = buildAuthClient(supabaseUrl, supabaseAnonKey, token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' }, { status: 401 });
    }

    const { data: actorProfile, error: actorError } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (actorError || !actorProfile || !isActiveRole(actorProfile.role)) {
      return NextResponse.json({ error: 'Từ chối truy cập.' }, { status: 403 });
    }

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Thiếu SUPABASE_SERVICE_ROLE_KEY trên server.' }, { status: 501 });
    }

    const { userId, fullName, phone, role } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu User ID.' }, { status: 400 });
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, role, tenant_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản cần cập nhật.' }, { status: 404 });
    }

    if (actorProfile.tenant_id && targetProfile.tenant_id && actorProfile.tenant_id !== targetProfile.tenant_id) {
      return NextResponse.json({ error: 'Tài khoản không thuộc cùng hệ thống.' }, { status: 403 });
    }

    const isSelf = user.id === userId;
    const hasProfileUpdate = typeof fullName === 'string' || typeof phone === 'string';
    const hasRoleUpdate = typeof role === 'string' && role !== targetProfile.role;

    if (!hasProfileUpdate && !hasRoleUpdate) {
      return NextResponse.json({ error: 'Không có dữ liệu để cập nhật.' }, { status: 400 });
    }

    if (hasProfileUpdate && !canEditUserProfile(actorProfile.role, targetProfile.role, isSelf)) {
      return NextResponse.json({ error: 'Bạn không có quyền sửa thông tin tài khoản này.' }, { status: 403 });
    }

    if (hasRoleUpdate && !canSetUserRole(actorProfile.role, targetProfile.role, role as any, isSelf)) {
      return NextResponse.json({ error: 'Bạn không có quyền thay đổi vai trò này.' }, { status: 403 });
    }

    const supabaseAdmin = getAdminClient(supabaseUrl, serviceRoleKey);

    const updatePayload: Record<string, string> = {};

    if (typeof fullName === 'string') {
      updatePayload.full_name = fullName.trim();
    }

    if (typeof phone === 'string') {
      updatePayload.phone = phone.trim();
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);

      if (profileUpdateError) {
        return NextResponse.json({ error: profileUpdateError.message || 'Lỗi khi cập nhật thông tin.' }, { status: 500 });
      }
    }

    if (typeof role === 'string') {
      const { error: roleUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (roleUpdateError) {
        return NextResponse.json({ error: roleUpdateError.message || 'Lỗi khi cập nhật vai trò.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Đã cập nhật tài khoản thành công.' });
  } catch (err: any) {
    console.error('[API Manage User] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const supabase = buildAuthClient(supabaseUrl, supabaseAnonKey, token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' }, { status: 401 });
    }

    const { data: actorProfile, error: actorError } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (actorError || !actorProfile || !isActiveRole(actorProfile.role)) {
      return NextResponse.json({ error: 'Từ chối truy cập.' }, { status: 403 });
    }

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Thiếu SUPABASE_SERVICE_ROLE_KEY trên server.' }, { status: 501 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu User ID.' }, { status: 400 });
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, role, tenant_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản cần xóa.' }, { status: 404 });
    }

    if (actorProfile.tenant_id && targetProfile.tenant_id && actorProfile.tenant_id !== targetProfile.tenant_id) {
      return NextResponse.json({ error: 'Tài khoản không thuộc cùng hệ thống.' }, { status: 403 });
    }

    const isSelf = user.id === userId;

    if (!canDeleteUser(actorProfile.role, targetProfile.role, isSelf)) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa tài khoản này.' }, { status: 403 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message || 'Lỗi khi xóa tài khoản Auth.' }, { status: 500 });
    }

    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      return NextResponse.json({ error: profileDeleteError.message || 'Lỗi khi xóa hồ sơ.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa tài khoản thành công.' });
  } catch (err: any) {
    console.error('[API Manage User] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}
