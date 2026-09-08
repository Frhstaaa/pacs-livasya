<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;


use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            $token = $user->createToken('auth_token')->plainTextToken;
            $userData = $user->toArray();
            $userData['permissions'] = $user->getAllPermissions();
            return response()->json(['token' => $token, 'user' => $userData], 200);
        }

        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully'], 200);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        $userData = $user->toArray();
        $userData['permissions'] = $user->getAllPermissions();
        return response()->json($userData);
    }
}
