<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'signature_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function userPermissions()
    {
        return $this->hasMany(UserPermission::class);
    }

    public function hasPermission(string $permissionName): bool
    {
        if ($this->role === 'superadmin') {
            return true;
        }

        // Check user-level override
        $override = $this->userPermissions()
            ->whereHas('permission', function ($q) use ($permissionName) {
                $q->where('name', $permissionName);
            })
            ->first();

        if ($override !== null) {
            return (bool) $override->is_granted;
        }

        // Fallback to role-level permissions
        return RolePermission::where('role', $this->role)
            ->whereHas('permission', function ($q) use ($permissionName) {
                $q->where('name', $permissionName);
            })
            ->exists();
    }

    public function getAllPermissions(): array
    {
        if ($this->role === 'superadmin') {
            return Permission::pluck('name')->toArray();
        }

        // Get permissions granted to the role
        $rolePermissions = Permission::whereHas('rolePermissions', function ($q) {
            $q->where('role', $this->role);
        })->pluck('name', 'id')->toArray(); // [id => name]

        // Apply user overrides
        $overrides = $this->userPermissions()->with('permission')->get();
        foreach ($overrides as $override) {
            if ($override->permission) {
                if ($override->is_granted) {
                    $rolePermissions[$override->permission_id] = $override->permission->name;
                } else {
                    unset($rolePermissions[$override->permission_id]);
                }
            }
        }

        return array_values($rolePermissions);
    }
}
