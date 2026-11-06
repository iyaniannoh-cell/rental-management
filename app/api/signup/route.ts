import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, phone, role } = await req.json();

    const cleanEmail = email?.trim().toLowerCase();
    const cleanPhone = phone?.trim();

    // 1. Basic email format check
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json(
        { error: "Please enter a valid email address (e.g. name@gmail.com)." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 2. Check if phone number is already registered in our profiles
    if (cleanPhone) {
      const { data: existingPhone } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existingPhone) {
        return NextResponse.json(
          { error: "An account with this phone number already exists. Please Log In." },
          { status: 400 }
        );
      }
    }

    // 3. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("unique")
      ) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please Log In." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData?.user) {
      return NextResponse.json(
        { error: "Failed to create user account. Please try again." },
        { status: 400 }
      );
    }

    // 4. Save profile in the profiles table
    const { error: profileError } = await supabaseAdmin.from("profiles").insert([
      {
        id: authData.user.id,
        full_name: fullName,
        role: role,
        phone: cleanPhone,
      },
    ]);

    if (profileError) {
      // If profile already exists
      if (profileError.message.includes("duplicate") || profileError.message.includes("unique")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please Log In." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, role });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Signup failed. Please try again." },
      { status: 500 }
    );
  }
}