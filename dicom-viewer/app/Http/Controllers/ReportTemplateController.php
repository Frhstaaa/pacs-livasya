<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ReportTemplate;
use Illuminate\Support\Facades\Auth;

class ReportTemplateController extends Controller
{
    /**
     * Get list of report templates (global + doctor's personal)
     */
    public function index(Request $request)
    {
        $doctorId = Auth::id();
        $query = ReportTemplate::availableFor($doctorId);

        if ($request->filled('modality') && $request->modality !== 'ALL') {
            $mod = strtoupper($request->modality);
            $query->where(function ($q) use ($mod) {
                $q->where('modality', $mod)
                  ->orWhere('modality', 'ALL');
            });
        }

        if ($request->filled('category') && $request->category !== 'ALL') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                  ->orWhere('category', 'like', $search)
                  ->orWhere('content', 'like', $search);
            });
        }

        $templates = $query->orderBy('is_favorite', 'desc')
                           ->orderBy('title', 'asc')
                           ->get();

        // Get unique categories for filter tabs
        $categories = ReportTemplate::availableFor($doctorId)
            ->select('category')
            ->distinct()
            ->pluck('category');

        return response()->json([
            'templates' => $templates,
            'categories' => $categories
        ]);
    }

    /**
     * Create a new custom template
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'modality' => 'required|string|max:16',
            'category' => 'nullable|string|max:64',
            'content' => 'required|string',
            'is_favorite' => 'nullable|boolean',
        ]);

        $template = ReportTemplate::create([
            'doctor_id' => Auth::id(),
            'title' => $request->title,
            'modality' => strtoupper($request->modality),
            'category' => $request->category ?: 'Umum',
            'content' => $request->content,
            'is_favorite' => $request->boolean('is_favorite', false),
        ]);

        return response()->json([
            'message' => 'Template ekspertise berhasil disimpan!',
            'template' => $template
        ], 201);
    }

    /**
     * Update an existing template
     */
    public function update(Request $request, $id)
    {
        $template = ReportTemplate::findOrFail($id);

        // Doctor can only edit their own templates unless superadmin
        if ($template->doctor_id && $template->doctor_id !== Auth::id() && Auth::user()->role !== 'superadmin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'modality' => 'sometimes|string|max:16',
            'category' => 'nullable|string|max:64',
            'content' => 'sometimes|string',
            'is_favorite' => 'sometimes|boolean',
        ]);

        $template->update($request->only(['title', 'modality', 'category', 'content', 'is_favorite']));

        return response()->json([
            'message' => 'Template berhasil diperbarui',
            'template' => $template
        ]);
    }

    /**
     * Delete custom template
     */
    public function destroy($id)
    {
        $template = ReportTemplate::findOrFail($id);

        if ($template->doctor_id && $template->doctor_id !== Auth::id() && Auth::user()->role !== 'superadmin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $template->delete();

        return response()->json(['message' => 'Template berhasil dihapus']);
    }

    /**
     * Toggle favorite status
     */
    public function toggleFavorite($id)
    {
        $template = ReportTemplate::findOrFail($id);
        $template->is_favorite = !$template->is_favorite;
        $template->save();

        return response()->json([
            'message' => $template->is_favorite ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit',
            'is_favorite' => $template->is_favorite
        ]);
    }
}
