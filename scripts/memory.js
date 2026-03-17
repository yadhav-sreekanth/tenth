window.createMemory = async function () {
  const title = document.getElementById('memoryTitle').value.trim();
  const desc = document.getElementById('memoryDesc').value.trim();
  const files = memoryFilesArray;

  if (!title) return alert('Enter memory title');
  if (files.length === 0) return alert('Add files first');

const progressContainer = document.getElementById('uploadProgressContainer');
const progressBar = document.getElementById('uploadProgressBar');
const progressText = document.getElementById('uploadProgressText');

  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.innerText = 'Uploading... 0%';

  const roll = parseInt(localStorage.getItem('classUserRoll'));

  let urls = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const filePath = await uploadWithProgress(file, 'memories');

    if (!filePath) continue;

    const { data } = supabase.storage.from('classfiles').getPublicUrl(filePath);

    urls.push(data.publicUrl);

    let percent = Math.round(((i + 1) / files.length) * 100);

    progressBar.style.width = percent + '%';
    progressText.innerText = `Uploading... ${percent}%`;
  }

  if (urls.length === 0) {
    alert('Upload failed');
    return;
  }

  const cover = urls[coverIndex] || urls[0];

  const excludeInput = document.getElementById('excludeRolls');
  const excludeArray = excludeInput.value
    ? excludeInput.value.split(',').map((n) => parseInt(n.trim()))
    : null;

  const { data: memory, error } = await supabase
    .from('memories')
    .insert({
      topic: title,
      description: desc,
      cover_image: cover,
      created_by: roll,
      visibility_exclude: excludeArray
    })
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  for (let url of urls) {
    await supabase.from('memory_media').insert({
      memory_id: memory.id,
      media_url: url,
      uploaded_by: roll
    });
  }

  progressBar.style.width = '100%';
  progressText.innerText = 'Upload Complete ✅';

  setTimeout(() => {
    progressContainer.style.display = 'none';
  }, 1500);

  loadMemories();

  memoryFilesArray = [];
  preview.innerHTML = '';
  document.getElementById('memoryTitle').value = '';
  document.getElementById('memoryDesc').value = '';
};
async function uploadWithProgress(file, folder) {
  const filePath = `${folder}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage.from('classfiles').upload(filePath, file);

  if (error) {
    console.error(error);
    return null;
  }

  return filePath;
}

async function loadMemories() {
  const roll = parseInt(localStorage.getItem('classUserRoll'));

  const { data: memories } = await supabase
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false });

  const grid = document.getElementById('memoriesGrid');
  grid.innerHTML = '';

  for (let m of memories) {
    if (m.visibility_exclude && m.visibility_exclude.includes(roll)) continue;

    const { data: media } = await supabase.from('memory_media').select('id').eq('memory_id', m.id);

    const mediaCount = media?.length || 0;

    grid.innerHTML += `
      <div class="memory-card">

        <img src="${m.cover_image}" onclick="openMemory(${m.id})">

        <div class="media-count">
          📷 ${mediaCount}
        </div>

        <div class="memory-overlay">
          <h3>${m.topic}</h3>
          <p>${m.description || ''}</p>
        </div>

      </div>
    `;
  }
}
window.deleteMemory = async function (id) {
  if (!confirm('Delete this memory?')) return;

  await supabase.from('memory_media').delete().eq('memory_id', id);

  await supabase.from('memories').delete().eq('id', id);

  loadMemories();
};
let galleryMedia = [];
let galleryIndex = 0;

window.openMemory = async function (id) {
  const { data: media } = await supabase
    .from('memory_media')
    .select('*')
    .eq('memory_id', id)
    .order('id', { ascending: true });

  if (!media || media.length === 0) return;

  galleryMedia = media;
  galleryIndex = 0;

  document.getElementById('galleryModal').classList.remove('hidden');

  showGalleryItem(); // show first item
};
function openGallery() {
  document.getElementById('galleryModal').classList.remove('hidden');
  showGalleryItem();
}

function closeGallery() {
  document.getElementById('galleryModal').classList.add('hidden');
}

function showGalleryItem() {
  const content = document.getElementById('galleryContent');
  const counter = document.getElementById('galleryCounter');

  const item = galleryMedia[galleryIndex];

  if (!item) return;

  content.innerHTML = '';

  let element;

  if (item.media_url.includes('.mp4')) {
    element = document.createElement('video');
    element.src = item.media_url;
    element.controls = true;
    element.autoplay = true;
  } else {
    element = document.createElement('img');
    element.src = item.media_url;
  }

  content.appendChild(element);

  counter.innerText = `${galleryIndex + 1} / ${galleryMedia.length}`;
}
function nextMedia() {
  if (galleryIndex < galleryMedia.length - 1) {
    galleryIndex++;
    showGalleryItem();
  }
}

function prevMedia() {
  if (galleryIndex > 0) {
    galleryIndex--;
    showGalleryItem();
  }
}

let tap = 0;

function tapDownload(url) {
  tap++;

  if (tap == 3) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memory';
    a.click();

    tap = 0;
  }

  setTimeout(() => (tap = 0), 700);
}

const photoInput = document.getElementById('photoInput');
const mediaPreview = document.getElementById('mediaPreview');

photoInput.addEventListener('change', async function () {
  mediaPreview.innerHTML = '';
  selectedMedia.photos = [];

  const files = Array.from(photoInput.files);

  for (let file of files) {
    // 🔥 Upload to Supabase
    const filePath = 'posts/' + Date.now() + '-' + file.name;

    const { error } = await supabase.storage.from('classfiles').upload(filePath, file);

    if (error) {
      console.error(error);
      continue;
    }

    // Get public URL
    const { data } = supabase.storage.from('classfiles').getPublicUrl(filePath);

    selectedMedia.photos.push(data.publicUrl);

    // Show preview
    const img = document.createElement('img');
    img.src = data.publicUrl;
    img.style.width = '120px';
    img.style.height = '120px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '16px';

    mediaPreview.appendChild(img);
  }
});

async function compressImage(file) {
  const img = await createImageBitmap(file);

  const canvas = document.createElement('canvas');

  const MAX = 1200;

  let width = img.width;
  let height = img.height;

  if (width > MAX) {
    height = height * (MAX / width);
    width = MAX;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.7);
  });
}

const dropZone = document.getElementById('dropZone');
const memoryInput = document.getElementById('memoryFiles');
const preview = document.getElementById('memoryPreview');

let memoryFilesArray = [];
let coverIndex = 0;

dropZone.addEventListener('click', () => {
  memoryInput.click();
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();

  memoryFilesArray = [...e.dataTransfer.files];
  memoryInput.files = e.dataTransfer.files;

  showPreview();
});

memoryInput.addEventListener('change', () => {
  memoryFilesArray = [...memoryInput.files];

  showPreview();
});

function showPreview() {
  preview.innerHTML = '';

  memoryFilesArray.forEach((file, index) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const div = document.createElement('div');
      div.className = 'preview-item';
      let mediaTag = '';

      if (file.type.startsWith('video')) {
        mediaTag = `<video src="${e.target.result}" muted></video>`;
      } else {
        mediaTag = `<img src="${e.target.result}">`;
      }

      div.innerHTML = `
${mediaTag}
<div class="remove-media">✕</div>
<div class="cover-badge ${index === 0 ? 'active' : ''}">
Cover
</div>
`;

      /* remove file */

      div.querySelector('.remove-media').onclick = () => {
        memoryFilesArray.splice(index, 1);

        showPreview();
      };

      /* set cover */

      div.querySelector('.cover-badge').onclick = () => {
        coverIndex = index;

        document.querySelectorAll('.cover-badge').forEach((b) => b.classList.remove('active'));

        div.querySelector('.cover-badge').classList.add('active');
      };

      preview.appendChild(div);
    };

    reader.readAsDataURL(file);
  });
}

function canViewMemory(memory) {
  const roll = parseInt(localStorage.getItem('classUserRoll'));

  if (!memory.visibility_exclude) return true;

  return !memory.visibility_exclude.includes(roll);
}
