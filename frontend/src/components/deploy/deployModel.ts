import type { LucideIcon } from 'lucide-react';
import { Download, GitBranch, Hammer, Play, Rocket, ScanSearch } from 'lucide-react';
import type { DeployStep } from '../../api/client';

export type StepState = 'pending' | 'running' | 'done' | 'error';

export interface StepDef {
  id: DeployStep;
  label: string;
  hint: string;
  icon: LucideIcon;
}

/** Steps shown for a Git deploy, in order. */
export const GIT_STEPS: StepDef[] = [
  { id: 'clone', label: 'Kodu indir', hint: 'Repo klonlanıyor', icon: GitBranch },
  { id: 'detect', label: 'Projeyi tanı', hint: 'Proje türü bulunuyor', icon: ScanSearch },
  { id: 'build', label: 'Derle', hint: 'Docker imajı hazırlanıyor', icon: Hammer },
  { id: 'start', label: 'Başlat', hint: 'Konteyner açılıyor', icon: Play },
  { id: 'ready', label: 'Yayında', hint: 'Adres hazır', icon: Rocket },
];

/** Steps shown for a ready-made image (template) deploy. */
export const IMAGE_STEPS: StepDef[] = [
  { id: 'pull', label: 'İmajı indir', hint: 'Docker Hub’dan alınıyor', icon: Download },
  { id: 'start', label: 'Başlat', hint: 'Konteyner açılıyor', icon: Play },
  { id: 'ready', label: 'Yayında', hint: 'Adres hazır', icon: Rocket },
];

/** Human name for the project type reported by the detect step. */
export const KIND_LABELS: Record<string, string> = {
  node: 'Node.js',
  'node-static': 'Vite / React',
  python: 'Python',
  go: 'Go',
  static: 'Statik site',
  dockerfile: 'Kendi Dockerfile’ı',
};

export interface FriendlyError {
  title: string;
  hint: string;
}

/** Turns a backend error message into a plain Turkish explanation and a next step. */
export function friendlyError(message: string): FriendlyError {
  const m = message.toLowerCase();
  if (m.includes('unsupported git url') || m.includes('invalid git url') || m.includes('url is required')) {
    return {
      title: 'Bu link kullanılamıyor',
      hint: 'https://github.com/kullanici/proje gibi bir Git linki yapıştır.',
    };
  }
  if (m.includes('git clone')) {
    return {
      title: 'Kod indirilemedi',
      hint: 'Linkin doğru ve reponun herkese açık olduğundan emin ol. Branch adı farklıysa Gelişmiş ayarlardan değiştir (örn. master).',
    };
  }
  if (m.includes('project type could not be detected') || m.includes('no dockerfile found')) {
    return {
      title: 'Proje türü tanınamadı',
      hint: 'Akson Node.js, Python, Go ve statik siteleri tanıyor. Projene bir Dockerfile eklersen her türlü proje çalışır.',
    };
  }
  if (m.includes('start" script') || m.includes('start\\" script') || m.includes('entry file')) {
    return {
      title: 'Uygulamanın nasıl başlatılacağı bulunamadı',
      hint: 'Node.js için package.json’a bir "start" scripti, Python için main.py veya app.py dosyası ekle.',
    };
  }
  if (m.includes('docker build failed')) {
    return {
      title: 'Derleme başarısız oldu',
      hint: 'Projenin kendi kodunda veya bağımlılıklarında bir hata var. Ayrıntılı loglarda son satırlara bak.',
    };
  }
  if (m.includes('exited right after starting')) {
    return {
      title: 'Uygulama başladı ama hemen kapandı',
      hint: 'Ayrıntılı loglarda uygulamanın son çıktısı var. Çoğu zaman eksik bir ortam değişkeni (ENV) ya da dosya yüzünden olur.',
    };
  }
  if (m.includes('port is already allocated') || m.includes('address already in use')) {
    return {
      title: 'Bu port dolu',
      hint: 'Gelişmiş ayarlarda dış portu 0 (otomatik) yap ya da başka bir sayı seç.',
    };
  }
  if (m.includes('pull') && m.includes('image')) {
    return {
      title: 'İmaj indirilemedi',
      hint: 'İmaj adını kontrol et (örn. nginx:alpine) ve internet bağlantını doğrula.',
    };
  }
  if (m.includes('docker is not available')) {
    return { title: 'Docker’a ulaşılamıyor', hint: 'Docker’ın çalıştığından emin ol ve sayfayı yenile.' };
  }
  return { title: 'Dağıtım başarısız oldu', hint: 'Ayrıntılı loglarda hatanın nedenini görebilirsin.' };
}
