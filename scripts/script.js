const currentUserRoll = localStorage.getItem('classUserRoll');
let currentChat = null;

(function () {
  // student roster
  window.studentRoster = [
    { roll: 1, name: 'AADIDEV M', nickname: '' },
    { roll: 2, name: 'AAGNA VAIGA U', nickname: '' },
    { roll: 3, name: 'ADHAN BERNARD ANTONY', nickname: '' },
    { roll: 4, name: 'AHMED FAHAMDHAAN', nickname: '' },
    { roll: 5, name: 'AMEYA M P', nickname: '' },
    { roll: 6, name: 'AVANI KRISHNA P', nickname: '' },
    { roll: 7, name: 'AVANTHIKA ANAND', nickname: '' },
    { roll: 8, name: 'AVANTHIKA SHINNITH', nickname: '' },
    { roll: 9, name: 'DEVANANDA P K', nickname: '' },
    { roll: 10, name: 'GOVARDHAN P K', nickname: '' },
    { roll: 11, name: 'KRISHNENDU U', nickname: '' },
    { roll: 12, name: 'MITHRA SABILASH', nickname: '' },
    { roll: 13, name: 'NISHAN M', nickname: '' },
    { roll: 14, name: 'PARVANA P', nickname: '' },
    { roll: 15, name: 'PIYUSH K', nickname: '' },
    { roll: 16, name: 'R. ADHARSH', nickname: '' },
    { roll: 17, name: 'SANDRA P', nickname: '' },
    { roll: 18, name: 'SHIVANI SUJESH K', nickname: '' },
    { roll: 19, name: 'SHREYA PRAJESH', nickname: '' },
    { roll: 20, name: 'SREEHARI V K', nickname: '' },
    { roll: 21, name: 'SREESHUKAN T P', nickname: '' },
    { roll: 22, name: 'THANMAYA T', nickname: '' },
    { roll: 23, name: 'UMA PARVATHI K T', nickname: '' },
    { roll: 24, name: 'VAMIKA M', nickname: '' },
    { roll: 25, name: 'VINAYAK P', nickname: '' },
    { roll: 26, name: 'VYBHAV V P', nickname: '' },
    { roll: 27, name: 'VYGA K C', nickname: '' },
    { roll: 28, name: 'YADHAV SREEKANTH', nickname: '' }
  ];

  // teacher
  const classTeacher = {
    name: 'REENA MISS',
    subject: 'Class Teacher'
  };

  // supabase init (use same as login)
  const SUPABASE_URL = 'https://mbijxyxodddknabhefmc.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iaWp4eXhvZGRka25hYmhlZm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDI2NzgsImV4cCI6MjA4ODgxODY3OH0.crhnBb5zsAauauaNXriVallPm6yi1S8ZjSmIG56kdfw';
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabase = window.supabaseClient;
  supabase
    .channel('community-posts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'community_posts' },
      (payload) => {
        const newPost = payload.new;

        // Prepend instead of reload
        renderSinglePostAtTop(newPost);
      }
    )
    .subscribe();
  let selectedMedia = {
    photos: []
  };
  supabase
    .channel('messages-live')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        const msg = payload.new;
        const myRoll = parseInt(localStorage.getItem('classUserRoll'));

        if (
          (currentChat === msg.sender_roll && msg.receiver_roll === myRoll) ||
          (currentChat === msg.receiver_roll && msg.sender_roll === myRoll)
        ) {
          const container = document.getElementById('chatMessages');
          const cls = msg.sender_roll == myRoll ? 'sent' : 'received';

          container.innerHTML += `
<div class="message ${cls}">
${msg.message}
</div>
`;

          container.scrollTop = container.scrollHeight;
        }
      }
    )
    .subscribe();
  let profileCache = {};

  async function loadProfiles() {
    const { data } = await supabase.from('profiles').select('roll, avatar_url');

    if (!data) return;

    data.forEach((p) => {
      profileCache[p.roll] = p.avatar_url;
    });
  }

  function renderAvatar(roll, initials) {
    const url = profileCache[roll];

    if (url) {
      return `<img src="${url}"
            style="width:100%;height:100%;
            object-fit:cover;border-radius:50%;">`;
    }

    return initials;
  }
  window.clearChat = async function () {
    if (!currentChat) {
      alert('Select a chat first');
      return;
    }

    if (!confirm('Delete this chat permanently?')) return;

    const myRoll = parseInt(localStorage.getItem('classUserRoll'));

    // Delete messages where:
    // (I sent AND other received) OR (other sent AND I received)

    const { error } = await supabase
      .from('messages')
      .delete()
      .or(
        `and(sender_roll.eq.${myRoll},receiver_roll.eq.${currentChat}),and(sender_roll.eq.${currentChat},receiver_roll.eq.${myRoll})`
      );

    if (error) {
      console.error('Delete error:', error);
      alert('Delete failed: ' + error.message);
      return;
    }

    // Clear UI
    document.getElementById('chatMessages').innerHTML = '';

    alert('Chat cleared successfully ✅');
  };

  // populate group grid
  function populateGroupGrid() {
    const grid = document.getElementById('groupGrid');
    grid.innerHTML = '';

    // add teacher first
    grid.innerHTML += `
                        <div class="student-card" style="border: 2px solid #ffd700;">
                            <div class="teacher-badge">✨ CLASS TEACHER</div>
                            <div class="student-avatar" style="background: linear-gradient(145deg, #ffd700, #ffa500);">👩‍🏫</div>
                            <div class="student-name">${classTeacher.name}</div>
                            <div class="student-roll">${classTeacher.subject}</div>
                            <div class="nickname-tag"><i class="fa-regular fa-pen-to-square"></i> Set nickname</div>
                        </div>
                    `;

    async function getAvatarUrl(roll) {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('roll', roll)
        .maybeSingle();

      return data?.avatar_url || null;
    }

    function formatName(name) {
      return name.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    }
    // add students
    studentRoster.forEach((s) => {
      const initials = s.name
        .split(' ')
        .map((n) => n[0])
        .join('');
      grid.innerHTML += `
                            <div class="student-card" data-roll="${s.roll}">
<div class="student-avatar">
${renderAvatar(s.roll, initials.substring(0, 2))}
</div>                                <div class="student-name">${s.name}</div>
                                <div class="student-roll">Roll - ${s.roll}</div>
                                <div class="nickname-tag" onclick="setNickname(${s.roll})">
                                    <i class="fa-regular fa-pen-to-square"></i> 
                                    <span id="nickname-${s.roll}">${s.nickname || 'Add Nickname'}</span>
                                </div>
                            </div>
                        `;
    });
  }

  window.setNickname = async function (roll) {
    const nickname = prompt('Enter nickname');

    if (!nickname) return;

    document.getElementById(`nickname-${roll}`).textContent = nickname;
    document.getElementById(`nickname-${roll}`).parentElement.classList.add('nickname-set');

    await supabase.from('nicknames').insert({
      target_roll: roll,
      nickname: nickname,
      set_by_roll: localStorage.getItem('classUserRoll')
    });
  };

  // toggle create memory form
  document.getElementById('showCreateMemory').addEventListener('click', () => {
    const form = document.getElementById('createMemoryForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });
  const avatar = document.getElementById('userAvatar');
  const upload = document.getElementById('avatarUpload');
  const avatarImg = document.getElementById('avatarImg');
  const avatarLetters = document.getElementById('avatarLetters');

  function setAvatarImage(url) {
    if (!url) return;

    avatarImg.src = url;
    avatarImg.style.display = 'block';
    avatarImg.style.objectFit = 'cover';
    avatarLetters.style.display = 'none';
  }

  async function loadAvatar() {
    if (!currentUserRoll) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('roll', currentUserRoll)
      .maybeSingle(); // 🔥 IMPORTANT FIX

    if (data?.avatar_url) {
      setAvatarImage(data.avatar_url);
    }
  }

  avatar.addEventListener('click', () => upload.click());

  upload.addEventListener('change', async () => {
    const file = upload.files[0];
    if (!file) return;

    const filePath = 'avatars/' + currentUserRoll + '-' + Date.now();

    const { error } = await supabase.storage
      .from('classfiles')
      .upload(filePath, file, { upsert: true });

    if (error) {
      alert(error.message);
      return;
    }

    const { data } = supabase.storage.from('classfiles').getPublicUrl(filePath);

    const avatarUrl = data.publicUrl;

    // 🔥 SAVE TO DATABASE
    await supabase.from('profiles').upsert({
      roll: currentUserRoll,
      avatar_url: avatarUrl
    });

    // Update UI immediately
    setAvatarImage(avatarUrl);
  });

  document.querySelector('.download-btn:nth-child(1)').addEventListener('click', () => {
    document.getElementById('photoInput').click();
  });

  function getName(roll) {
    const student = studentRoster.find((s) => s.roll == roll);

    if (student) {
      return student.name;
    }

    return 'Unknown';
  }

  // BIO RATING
  const stars = document.querySelectorAll('#ratingStars span');

  stars.forEach((star) => {
    star.addEventListener('click', () => {
      const value = star.dataset.value;

      stars.forEach((s) => s.classList.remove('active'));

      for (let i = 0; i < value; i++) {
        stars[i].classList.add('active');
      }

      alert('Thanks for rating ⭐');
    });
  });

  async function uploadWithProgress(file, folder, progressBar, counter, total, index) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      const filePath = `${folder}/${Date.now()}-${file.name}`;

      xhr.open('POST', SUPABASE_URL + '/storage/v1/object/classfiles/' + filePath);

      xhr.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_ANON_KEY);
      xhr.setRequestHeader('x-upsert', 'true');

      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
          const percent = (event.loaded / event.total) * (1 / total) * 100 + (index / total) * 100;

          progressBar.style.width = percent + '%';

          counter.innerText = `Uploading ${index + 1} / ${total} (${Math.round(percent)}%)`;
        }
      };

      xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 201) {
          resolve(filePath);
        } else {
          reject(xhr.responseText);
        }
      };

      xhr.onerror = reject;

      const formData = new FormData();
      formData.append('file', file);

      xhr.send(formData);
    });
  }

  
  // sidebar navigation
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      // remove active from all nav items
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');

      // hide all sections
      sections.forEach((s) => s.classList.remove('active-section'));

      // show selected section
      const sectionId = item.dataset.section;
      document.getElementById(sectionId).classList.add('active-section');

      // close sidebar on mobile
      if (window.innerWidth <= 1024) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });

  window.loadChatList = function () {
    const container = document.getElementById('chatList');
    container.innerHTML = '';

    studentRoster.forEach((s) => {
      if (s.roll == currentUserRoll) return;

      const initials = s.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2);

      container.innerHTML += `
<div class="chat-user" onclick="openChat(${s.roll})">
    <div class="chat-avatar">
        ${renderAvatar(s.roll, initials)}
    </div>
    <div>${s.name}</div>
</div>`;
    });
  };
  // 🔎 LIVE SEARCH FOR CHAT LIST
  const chatSearchInput = document.getElementById('chatSearch');

  if (chatSearchInput) {
    chatSearchInput.addEventListener('input', function () {
      const query = this.value.toLowerCase().trim();
      filterChatList(query);
    });
  }

  function filterChatList(query) {
    const chatUsers = document.querySelectorAll('.chat-user');

    chatUsers.forEach((user) => {
      const nameElement = user.querySelector('.chat-name');
      const name = nameElement ? nameElement.innerText.toLowerCase() : user.innerText.toLowerCase();

      user.style.display = name.includes(query) ? 'flex' : 'none';
    });
  }

  window.openChat = async function (roll) {
    currentChat = roll;

    const student = studentRoster.find((s) => s.roll == roll);
    document.getElementById('chatHeader').innerText = student.name;

    loadMessages();
  };

  window.closeChat = function () {
    const container = document.querySelector('.chat-container');

    container.classList.remove('chat-open');

    currentChat = null;
  };

  window.loadMessages = async function () {
    const container = document.getElementById('chatMessages');
    const myRoll = parseInt(localStorage.getItem('classUserRoll'));

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_roll.eq.${myRoll},receiver_roll.eq.${currentChat}),and(sender_roll.eq.${currentChat},receiver_roll.eq.${myRoll})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    container.innerHTML = '';

    if (!data || data.length === 0) return;

    data.forEach((m) => {
      const cls = m.sender_roll == myRoll ? 'sent' : 'received';

      container.innerHTML += `
<div class="message ${cls}">
${m.message}
</div>`;
    });

    container.scrollTop = container.scrollHeight;
  };
  window.sendMessage = async function () {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();

    if (!text || !currentChat) return;

    const myRoll = parseInt(localStorage.getItem('classUserRoll'));

    const { error } = await supabase.from('messages').insert({
      sender_roll: myRoll,
      receiver_roll: currentChat,
      message: text
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    input.value = '';
    loadMessages();
  };


  document.getElementById('chatInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');

  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  window.closeMenu = function () {
    document.getElementById('sidebar').classList.remove('open');
  };

  (async function initApp() {
    checkAuth();

    await loadProfiles(); // 🔥 LOAD AVATARS FIRST
    // 🔥 SET USER NAME IN TOP BAR
    const name = localStorage.getItem('classUserName');

    if (name) {
      const nameElement = document.getElementById('userDisplayName');
      if (nameElement) {
        nameElement.textContent = name;
      }

      // Optional: update avatar initials
      const initials = name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

      document.getElementById('avatarLetters').textContent = initials;
    }
    loadAvatar(); // top bar avatar
    populateGroupGrid();
    postsPage = 0;
    hasMorePosts = true;
    loadPosts(false);
    loadMemories();
    loadChatList();
  })();
})();

function toggleMarks() {
  const marks = document.getElementById('marksContent');
  const toggle = document.getElementById('marksToggle');

  if (toggle.checked) {
    marks.style.display = 'block';
  } else {
    marks.style.display = 'none';
  }
}
