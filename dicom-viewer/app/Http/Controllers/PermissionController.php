<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Permission;
use App\Models\RolePermission;
use App\Models\User;
use App\Models\UserPermission;
use Database\Seeders\PermissionSeeder;
use Illuminate\Support\Facades\DB;

class PermissionController extends Controller
{
    /**
     * Get all permissions and current role-permission mapping.
     */
    public function index()
    {
        $permissions = Permission::orderBy('module')->orderBy('id')->get();
        $groupedPermissions = $permissions->groupBy('module');

        $roles = ['superadmin', 'doctor', 'radiographer', 'nurse'];

        // Build mapping of role => array of granted permission IDs
        $rolePermissions = [];
        foreach ($roles as $r) {
            if ($r === 'superadmin') {
                // Superadmin always has everything
                $rolePermissions[$r] = $permissions->pluck('id')->toArray();
            } else {
                $rolePermissions[$r] = RolePermission::where('role', $r)
                    ->pluck('permission_id')
                    ->toArray();
            }
        }

        return response()->json([
            'modules' => $groupedPermissions,
            'all_permissions' => $permissions,
            'roles' => $roles,
            'role_permissions' => $rolePermissions,
        ]);
    }

    /**
     * Save the entire role-permission matrix.
     */
    public function updateRoles(Request $request)
    {
        $request->validate([
            'matrix' => 'required|array', // e.g. ['doctor' => [1, 2, 5], 'nurse' => [1, 3]]
        ]);

        $matrix = $request->matrix;

        DB::transaction(function () use ($matrix) {
            foreach ($matrix as $role => $permissionIds) {
                // Superadmin permissions are immutable / always full
                if ($role === 'superadmin') {
                    continue;
                }

                // Delete existing for this role
                RolePermission::where('role', $role)->delete();

                // Insert new selections
                if (is_array($permissionIds) && count($permissionIds) > 0) {
                    $records = array_map(function ($permId) use ($role) {
                        return [
                            'role' => $role,
                            'permission_id' => $permId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }, array_unique($permissionIds));

                    RolePermission::insert($records);
                }
            }
        });

        return response()->json([
            'message' => 'Matriks hak akses peran berhasil diperbarui.',
        ]);
    }

    /**
     * Get user-level permission overrides and effective permissions.
     */
    public function getUserPermissions($userId)
    {
        $user = User::findOrFail($userId);
        $permissions = Permission::orderBy('module')->orderBy('id')->get();

        // Overrides on this specific user: [permission_id => is_granted (bool)]
        $overrides = UserPermission::where('user_id', $user->id)
            ->pluck('is_granted', 'permission_id')
            ->toArray();

        // Role defaults for this user
        $rolePermissionIds = RolePermission::where('role', $user->role)
            ->pluck('permission_id')
            ->toArray();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'effective_permissions' => $user->getAllPermissions(),
            'role_permission_ids' => $rolePermissionIds,
            'overrides' => $overrides,
        ]);
    }

    /**
     * Save user-level permission overrides.
     */
    public function updateUserPermissions(Request $request, $userId)
    {
        $user = User::findOrFail($userId);

        $request->validate([
            'overrides' => 'required|array', // ['perm_id' => 'default' | 'granted' | 'revoked']
        ]);

        $overrides = $request->overrides;

        DB::transaction(function () use ($user, $overrides) {
            foreach ($overrides as $permId => $status) {
                if ($status === 'default') {
                    // Remove individual override (fall back to role)
                    UserPermission::where('user_id', $user->id)
                        ->where('permission_id', $permId)
                        ->delete();
                } elseif ($status === 'granted') {
                    UserPermission::updateOrCreate(
                        ['user_id' => $user->id, 'permission_id' => $permId],
                        ['is_granted' => true]
                    );
                } elseif ($status === 'revoked') {
                    UserPermission::updateOrCreate(
                        ['user_id' => $user->id, 'permission_id' => $permId],
                        ['is_granted' => false]
                    );
                }
            }
        });

        return response()->json([
            'message' => "Hak akses individual untuk {$user->name} berhasil diperbarui.",
            'effective_permissions' => $user->getAllPermissions(),
        ]);
    }

    /**
     * Reset role permissions matrix to standard clinical defaults.
     */
    public function resetDefaults()
    {
        // Re-run the standard seeder
        $seeder = new PermissionSeeder();
        $seeder->run();

        return response()->json([
            'message' => 'Matriks hak akses berhasil dikembalikan ke standar klinis RSIA Livasya.',
        ]);
    }
}
