import { PostRepository } from "@/lib/repositories/post-repository";
import { postCreateSchema } from "@/lib/validation/post-schemas";
import { ApiError } from "@/lib/api/errors";
import type { PostCreateInput } from "@/lib/validation/post-schemas";

/**
 * Service for post business logic
 * Handles validation, authorization checks, and coordinates repository calls
 */
export class PostService {
  private repository = new PostRepository();

  async getPost(id: string) {
    const post = await this.repository.findById(id);

    if (!post) {
      throw new ApiError("NOT_FOUND", "Post not found", 404);
    }

    return post;
  }

  async listPosts(params: {
    limit: number;
    cursor?: string;
    userId?: string;
    jerseyId?: string;
  }) {
    return await this.repository.findMany(params);
  }

  async createPost(input: PostCreateInput, userId: string) {
    const validated = postCreateSchema.parse(input);

    // Ensure either content or jerseyId is provided (DB constraint)
    if (!validated.content && !validated.jerseyId) {
      throw new ApiError(
        "BAD_REQUEST",
        "Either content or jerseyId must be provided",
        400
      );
    }

    return await this.repository.create({
      user_id: userId,
      content: validated.content || null,
      jersey_id: validated.jerseyId || null,
    });
  }

  async updatePost(id: string, input: Partial<PostCreateInput>, userId: string) {
    const post = await this.repository.findById(id);

    if (!post) {
      throw new ApiError("NOT_FOUND", "Post not found", 404);
    }

    if (post.user_id !== userId) {
      throw new ApiError("FORBIDDEN", "You can only update your own posts", 403);
    }

    const updateData: Record<string, unknown> = {};
    if (input.content !== undefined) updateData.content = input.content;
    if (input.jerseyId !== undefined) updateData.jersey_id = input.jerseyId;

    return await this.repository.update(id, updateData);
  }

  async deletePost(id: string, userId: string) {
    const post = await this.repository.findById(id);

    if (!post) {
      throw new ApiError("NOT_FOUND", "Post not found", 404);
    }

    if (post.user_id !== userId) {
      throw new ApiError("FORBIDDEN", "You can only delete your own posts", 403);
    }

    await this.repository.delete(id);
  }
}

