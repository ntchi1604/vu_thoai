import {
  ArrowRight,
  BookOpenText,
  Camera,
  ChatCircleText,
  HandHeart,
  HandWaving,
  List,
  LockKey,
  Microphone,
  UsersThree,
  X,
} from '@phosphor-icons/react'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'

const EASE = [0.16, 1, 0.3, 1]

export function LandingPage({ onOpenTool }) {
  const reduce = useReducedMotion()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function closeMenu() {
    setIsMenuOpen(false)
  }

  return (
    <div className="landing-page">
      <header className="landing-nav-wrap">
        <nav className="landing-nav" aria-label="Điều hướng chính">
          <a className="landing-brand" href="#top" onClick={closeMenu}>
            <HandWaving size={31} weight="duotone" aria-hidden="true" />
            <span>Vũ Thoại</span>
          </a>

          <button
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
            className="landing-menu-toggle"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            {isMenuOpen ? <X size={22} /> : <List size={22} />}
          </button>

          <div className={`landing-nav-links ${isMenuOpen ? 'is-open' : ''}`}>
            <a href="#su-menh" onClick={closeMenu}>Sứ mệnh</a>
            <a href="#cong-dong" onClick={closeMenu}>Cộng đồng</a>
            <a href="#hoat-dong" onClick={closeMenu}>Cách hoạt động</a>
          </div>

          <button className="landing-nav-cta" onClick={onOpenTool} type="button">
            Mở công cụ <ArrowRight size={17} weight="bold" />
          </button>
        </nav>
      </header>

      <main id="top">
        <section className="landing-hero" aria-labelledby="landing-title">
          <motion.div
            className="landing-hero-copy"
            initial={reduce ? false : { opacity: 0.78, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, ease: EASE }}
          >
            <span className="landing-eyebrow">Dự án cộng đồng Việt Nam</span>
            <h1 id="landing-title">
              <span>Giao tiếp thuộc về</span>
              <span>mọi người.</span>
            </h1>
            <p>Vũ Thoại kết nối ký hiệu, giọng nói và văn bản tiếng Việt trong một công cụ cộng đồng mở.</p>
            <div className="landing-hero-actions">
              <button className="landing-primary-button" onClick={onOpenTool} type="button">
                Mở công cụ <ArrowRight size={19} weight="bold" />
              </button>
              <a className="landing-text-link" href="#su-menh">Tìm hiểu dự án</a>
            </div>
          </motion.div>
        </section>

        <RevealSection className="landing-manifesto" id="su-menh" reduce={reduce}>
          <div className="landing-section-copy">
            <h2>Một cuộc trò chuyện không nên phụ thuộc vào việc ai có thể nghe.</h2>
            <p>Chúng tôi xây một công cụ thực tế để người Điếc, người nghe và gia đình có thể hiểu nhau trong những khoảnh khắc thường ngày.</p>
          </div>
          <div className="manifesto-notes" aria-label="Nguyên tắc của dự án">
            <div><HandHeart size={27} weight="duotone" /><span>Thiết kế cùng cộng đồng</span></div>
            <div><LockKey size={27} weight="duotone" /><span>Thư viện cá nhân lưu theo tài khoản</span></div>
            <div><BookOpenText size={27} weight="duotone" /><span>Thư viện do người dùng tạo</span></div>
          </div>
        </RevealSection>

        <RevealSection className="landing-capabilities" id="cong-dong" reduce={reduce}>
          <div className="landing-section-copy compact-copy">
            <h2>Công cụ thích nghi với cách bạn giao tiếp.</h2>
            <p>Không có hành động gán sẵn. Mỗi ký hiệu được ghi từ chính người dùng và ngữ cảnh của họ.</p>
          </div>

          <div className="capability-grid">
            <article className="capability-item capability-library">
              <UsersThree size={34} weight="duotone" aria-hidden="true" />
              <h3>Thư viện ký hiệu riêng</h3>
              <p>Ghi mẫu một tay hoặc hai tay, đặt câu tiếng Việt và bổ sung nhiều biến thể cho cùng một ký hiệu.</p>
            </article>
            <article className="capability-item capability-camera">
              <Camera size={34} weight="duotone" aria-hidden="true" />
              <h3>Nhận diện trực tiếp</h3>
              <p>Phụ đề xuất hiện ngay trên camera và tự chờ động tác mới mà không cần đưa tay ra khỏi khung hình.</p>
            </article>
            <article className="capability-item capability-dialogue">
              <ChatCircleText size={34} weight="duotone" aria-hidden="true" />
              <h3>Đối thoại hai chiều</h3>
              <p>Ký hiệu thành văn bản, giọng nói thành văn bản và lịch sử hội thoại trong cùng một nơi.</p>
            </article>
            <figure className="capability-photo">
              <img
                alt="Hai thành viên cộng đồng cùng ghi lại một ký hiệu bằng camera"
                loading="lazy"
                src="/images/community-library.jpg"
              />
              <figcaption>Mỗi mẫu tốt bắt đầu từ người hiểu rõ ký hiệu đó.</figcaption>
            </figure>
          </div>
        </RevealSection>

        <RevealSection className="community-story" reduce={reduce}>
          <div className="community-story-media">
            <img
              alt="Một nhóm người Việt trò chuyện với nhau bằng ngôn ngữ ký hiệu"
              loading="lazy"
              src="/images/community-hero.jpg"
            />
          </div>
          <div className="community-story-copy">
            <h2>Không học thay cộng đồng. Học từ cộng đồng.</h2>
            <p>Vũ Thoại không áp đặt một bộ ký hiệu cố định. Người dùng tự xây thư viện phù hợp với vùng miền, gia đình và môi trường giao tiếp của mình.</p>
            <div className="story-principle">
              <strong>Quyền kiểm soát thuộc về người dùng</strong>
              <span>Thư viện ký hiệu gắn với tài khoản của bạn và có thể xóa bất cứ lúc nào.</span>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="landing-process" id="hoat-dong" reduce={reduce}>
          <div className="landing-section-copy compact-copy">
            <h2>Từ ký hiệu đến câu nói.</h2>
          </div>
          <div className="process-track">
            <article>
              <span><Camera size={25} weight="duotone" /></span>
              <h3>Ghi mẫu</h3>
              <p>Giữ tay ổn định, chờ đếm ngược và thực hiện trọn vẹn ký hiệu.</p>
            </article>
            <article>
              <span><HandWaving size={25} weight="duotone" /></span>
              <h3>Ra hiệu</h3>
              <p>Camera so khớp chuyển động với những mẫu đã có trong thư viện.</p>
            </article>
            <article>
              <span><Microphone size={25} weight="duotone" /></span>
              <h3>Đối thoại</h3>
              <p>Câu tiếng Việt hiện trên camera, có thể đọc thành tiếng và lưu vào lịch sử.</p>
            </article>
          </div>
        </RevealSection>

        <RevealSection className="landing-final-cta" reduce={reduce}>
          <HandHeart size={45} weight="duotone" aria-hidden="true" />
          <h2>Bắt đầu bằng ký hiệu của bạn.</h2>
          <p>Mở camera, tạo thư viện riêng và cùng làm giao tiếp dễ tiếp cận hơn.</p>
          <button className="landing-primary-button" onClick={onOpenTool} type="button">
            Mở công cụ <ArrowRight size={19} weight="bold" />
          </button>
        </RevealSection>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="#top">
          <HandWaving size={27} weight="duotone" aria-hidden="true" />
          <span>Vũ Thoại</span>
        </a>
        <p>Dự án cộng đồng vì giao tiếp dễ tiếp cận.</p>
        <button onClick={onOpenTool} type="button">Mở công cụ</button>
      </footer>
    </div>
  )
}

function RevealSection({ children, className, id, reduce }) {
  return (
    <motion.section
      className={className}
      id={id}
      initial={reduce ? false : { opacity: 0.74, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.66, ease: EASE }}
    >
      {children}
    </motion.section>
  )
}
