let profileCache = {};

function renderAvatar(roll, initials) {
  const avatarUrl = profileCache[roll];

  if (avatarUrl) {
    return `<img src="${avatarUrl}" class="avatar-img">`;
  }

  return `<div class="avatar-fallback">${initials}</div>`;
}
function getColor(roll) {
  const colors = ['#ff6b6b', '#6bcB77', '#4d96ff', '#ffd93d', '#845ec2'];
  return colors[roll % colors.length];
}

function renderAvatar(roll, initials) {
  const avatarUrl = profileCache[roll];

  if (avatarUrl) {
    return `<img src="${avatarUrl}" class="avatar-img">`;
  }

  return `<div class="avatar-fallback" style="background:${getColor(roll)}">
            ${initials}
          </div>`;
}
function renderPosts(posts) {
  const container = document.getElementById('postsFeed');
  container.innerHTML = '';

  posts.forEach((post) => {
    const showDelete = post.posted_by == currentUserRoll;

    const deleteButton = showDelete
      ? `<button class="delete-post" onclick="deletePost(${post.id})">
<i class="fas fa-trash"></i>
</button>`
      : '';

    container.innerHTML += `
<div class="post-card">

<div class="post-header">
<span class="post-author">${post.posted_by}</span>
${deleteButton}
</div>

<div class="post-content">${post.content || ''}</div>

${post.photos ? post.photos.map((p) => `<img src="${p}" class="post-media">`).join('') : ''}

</div>
`;
  });
}

async function uploadFile(file, folder) {
  const progressBox = document.getElementById('uploadProgressBox');
  const progressBar = document.getElementById('uploadProgressBar');

  progressBox.style.display = 'block';
  progressBar.style.width = '0%';

  const filePath = `${folder}/${Date.now()}-${file.name}`;

  /* fake smooth progress animation */

  let progress = 0;

  const interval = setInterval(() => {
    if (progress < 90) {
      progress += 10;
      progressBar.style.width = progress + '%';
    }
  }, 200);

  const { data, error } = await supabase.storage.from('classfiles').upload(filePath, file);

  clearInterval(interval);

  if (error) {
    console.error('Upload error:', error);
    progressBox.style.display = 'none';
    return null;
  }

  progressBar.style.width = '100%';

  setTimeout(() => {
    progressBox.style.display = 'none';
  }, 500);

  const { data: publicUrl } = supabase.storage.from('classfiles').getPublicUrl(filePath);

  return publicUrl.publicUrl;
}

window.createPost = async function () {
  const text = document.querySelector('.community-text').value;
  const roll = parseInt(localStorage.getItem('classUserRoll'));

  const { data, error } = await window.db.from('community_posts').insert({
    content: text,
    posted_by: roll,
    photos: selectedMedia.photos
  });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  // reset form
  document.querySelector('.community-text').value = '';
  selectedMedia = { photos: [] };
  document.getElementById('mediaPreview').innerHTML = '';
  loadPosts();
};
function formatPostTime(createdAt) {
  const now = new Date();
  const postDate = new Date(createdAt);

  const diffMs = now.getTime() - postDate.getTime();

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // 🟢 Just now
  if (diffSeconds < 60) return 'Just now';

  // 🕒 Minutes
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : diffMinutes + ' minutes ago';
  }

  // 🕒 Hours
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : diffHours + ' hours ago';
  }

  // 📅 Days
  if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : diffDays + ' days ago';
  }

  // 📆 Weeks
  const weeks = Math.floor(diffDays / 7);

  return weeks === 1 ? '1 week ago' : weeks + ' weeks ago';
}
let postsPage = 0;
const POSTS_LIMIT = 20;
let isLoadingPosts = false;
let hasMorePosts = true;

  async function loadPosts(loadMore = false) {
  if (isLoadingPosts || !hasMorePosts) return;

  isLoadingPosts = true;

  const roll = parseInt(localStorage.getItem('classUserRoll'));

  const { data: posts, error } = await supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(postsPage * POSTS_LIMIT, (postsPage + 1) * POSTS_LIMIT - 1);

  if (error) {
    console.error(error);
    isLoadingPosts = false;
    return;
  }

  if (!posts || posts.length === 0) {
    hasMorePosts = false;
    isLoadingPosts = false;
    return;
  }

  const container = document.getElementById('postsFeed');

  // ❗ IMPORTANT: Only clear on first load
  if (!loadMore && postsPage === 0) {
    container.innerHTML = '';
    hasMorePosts = true;
  }
const { data: userLikes } = await supabase
  .from('post_reactions')
  .select('post_id')
  .eq('user_roll', roll);

    const likedPostIds = new Set(userLikes.map((l) => l.post_id));
    
  let html = '';

  for (let p of posts) {
    let mediaHtml = '';

    if (p.photos && p.photos.length > 0) {
      for (let url of p.photos) {
        mediaHtml += `<img src="${url}" class="post-media" loading="lazy">`;
      }
    }

    html += `
<div class="post-card">
    <div class="post-header">
        <div class="post-avatar">
            ${renderAvatar(p.posted_by, getName(p.posted_by).substring(0, 2))}
        </div>
        <div>
            <div class="post-author">${getName(p.posted_by)}</div>
            <div class="post-time">
                ${formatPostTime(p.created_at)}
            </div>
        </div>
    </div>

    <div class="post-content">${p.content || ''}</div>

    ${mediaHtml}

    <div class="post-actions">
        <div class="post-action like-btn" id="likeBtn-${p.id}" onclick="likePost(${p.id})">
            <i class="fa-regular fa-heart"></i>
            <span id="likeCount-${p.id}">0</span>
        </div>

        <div class="post-action" onclick="showComments(${p.id})">
            <i class="fa-regular fa-comment"></i> Comment
        </div>

        ${
          p.posted_by == roll
            ? `<div class="post-action" onclick="deletePost(${p.id})">
                <i class="fa-regular fa-trash-can"></i> Delete
               </div>`
            : ''
        }
    </div>

    <div id="comments-${p.id}" class="comments-container"></div>
</div>`;
    updateLikeCount(p.id);
  }

  container.insertAdjacentHTML('beforeend', html);

  postsPage++;

  isLoadingPosts = false;
}

const feed = document.getElementById('postsFeed');

window.addEventListener('scroll', () => {
  const feedSection = document.getElementById('feed');

  if (!feedSection.classList.contains('active-section')) return;

  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    loadPosts(true);
  }
});

window.deletePost = async function (postId) {
  if (!confirm('Delete this post?')) return;

  const { error } = await window.db.from('community_posts').delete().eq('id', postId);

  if (error) {
    console.error(error);
    return;
  }

  // Reset pagination
  postsPage = 0;
  hasMorePosts = true;

  loadPosts(false);
};
window.likePost = async function (postId) {
  const roll = parseInt(localStorage.getItem('classUserRoll'));

  const { data } = await supabase
    .from('post_reactions')
    .select('*')
    .eq('post_id', postId)
    .eq('user_roll', roll);

  if (data.length > 0) {
    alert('You already liked this post');
    return;
  }

  await window.db.from('post_reactions').insert({
    post_id: postId,
    user_roll: roll,
    reaction_type: 'like'
  });

  document.getElementById('likeBtn-' + postId).classList.add('liked');

  updateLikeCount(postId);
};
async function updateLikeCount(postId) {
  const { count } = await supabase
    .from('post_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  const el = document.getElementById('likeCount-' + postId);
  if (el) el.innerText = count;
}
window.showComments = async function (postId) {
  const container = document.getElementById('comments-' + postId);

  container.innerHTML = `

<div class="comment-box">

<input 
id="commentInput-${postId}" 
placeholder="Write a comment..."
class="comment-input">

<button onclick="addComment(${postId})" class="comment-btn">
Post
</button>

</div>

<div id="commentList-${postId}" class="comment-list"></div>
`;

  loadComments(postId);
};
window.addComment = async function (postId) {
  const text = document.getElementById('commentInput-' + postId).value;
  const roll = parseInt(localStorage.getItem('classUserRoll'));

  await window.db.from('post_comments').insert({
    post_id: postId,
    user_roll: roll,
    comment: text
  });

  loadComments(postId);
};
async function loadComments(postId) {
  const { data } = await supabase.from('post_comments').select('*').eq('post_id', postId);

  const container = document.getElementById('commentList-' + postId);

  container.innerHTML = '';

  data.forEach(async (c) => {
    const roll = parseInt(localStorage.getItem('classUserRoll'));

    const { data: liked } = await supabase
      .from('post_reactions')
      .select('*')
      .eq('comment_id', c.id)
      .eq('user_roll', roll);

    const likedClass = liked.length > 0 ? 'liked' : '';

    container.innerHTML += `
<div class="comment-item">

<span class="comment-user">${getName(c.user_roll)}</span>
<span class="comment-text">${c.comment}</span>

<div class="comment-actions">

<span class="${likedClass}" onclick="likeComment(${c.id})">
<i class="fa-regular fa-heart"></i>
<span id="commentLike-${c.id}">0</span>
</span>

<span onclick="deleteComment(${c.id},${postId})">
<i class="fa-regular fa-trash-can"></i>
</span>

</div>

</div>
`;

    updateCommentLike(c.id);
  });
}
window.likeComment = async function (commentId) {
  const roll = parseInt(localStorage.getItem('classUserRoll'));

  const { data } = await supabase
    .from('post_reactions')
    .select('*')
    .eq('comment_id', commentId)
    .eq('user_roll', roll);

  if (data.length > 0) {
    alert('You already liked this comment');
    return;
  }

  await window.db.from('post_reactions').insert({
    comment_id: commentId,
    user_roll: roll,
    reaction_type: 'like'
  });

  document.querySelector(`[onclick="likeComment(${commentId})"]`).classList.add('liked');

  updateCommentLike(commentId);
};
async function checkIfLiked(postId, roll) {
  const { data } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_roll', roll);

  return data.length > 0;
}

async function updateCommentLike(commentId) {
  const { count } = await supabase
    .from('post_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', commentId);

  document.getElementById('commentLike-' + commentId).innerText = count;
}
window.deleteComment = async function (commentId, postId) {
  if (!confirm('Delete this comment?')) return;

  await window.db.from('post_comments').delete().eq('id', commentId);

  loadComments(postId);
};
