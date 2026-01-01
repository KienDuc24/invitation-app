# ProjectorStory Component - Quick Reference

## Import
```tsx
import ProjectorStory from '@/components/ProjectorStory';
```

## Props Interface
```typescript
interface ProjectorStoryProps {
  postImage?: string;      // Image URL to display
  content?: string;        // Caption/text content
  comments?: any[];        // Comments array
  authorName?: string;     // Author name
  onClose: () => void;     // Required: callback to close
}
```

## Basic Usage
```tsx
<ProjectorStory
  postImage="https://example.com/image.jpg"
  content="My memorable moment"
  comments={[
    { content: "Beautiful!", guests: { name: "Friend 1" } },
    { content: "Amazing!", guests: { name: "Friend 2" } }
  ]}
  authorName="You"
  onClose={() => setShowProjector(false)}
/>
```

## GuestDashboard Implementation
```tsx
const [showProjector, setShowProjector] = useState(false);
const [selectedConfessionForStory, setSelectedConfessionForStory] = useState(null);

// Trigger function
const openProjector = (confession) => {
  setSelectedConfessionForStory(confession);
  setShowProjector(true);
};

// Render
{showProjector && (
  <ProjectorStory
    postImage={selectedConfessionForStory?.image_url}
    content={selectedConfessionForStory?.content}
    comments={selectedConfessionForStory?.comments || []}
    authorName={
      selectedConfessionForStory?.guests?.name || 
      selectedConfessionForStory?.guest?.name || 
      guest?.name || 
      "Guest"
    }
    onClose={() => setShowProjector(false)}
  />
)}
```

## Playback Timeline

| Time | Stage | Effect |
|------|-------|--------|
| 0-3s | Countdown | Number 3→2→1 with spinner & jitter |
| 3-5s | Intro | Lens flare bloom transition |
| 5-20s | Playing | Content display with scroll animation |
| 20s+ | End | Replay & Close buttons |

## Comment Object Format

The component expects comment objects with this structure:
```typescript
{
  content?: string;     // Comment text
  text?: string;        // Alternative property name
  guests?: {
    name: string;       // Comment author name
  };
  user?: string;        // Alternative author property
}
```

**Fallback chain for comment text:**
- `cmt.content` → `cmt.text` → `cmt` (if string)

**Fallback chain for author name:**
- `cmt.guests?.name` → `cmt.user` → "Người bí ẩn"

## Features

✅ **4-Stage Experience**
- Countdown with jitter effect
- Lens flare intro
- Scrolling content with film strips
- End screen

✅ **Visual Effects**
- Film strip perforations (left/right)
- Sepia filter + contrast boost
- Noise texture overlay
- Vignette darkening
- Light flicker animation
- Date stamp (20.11.2025)
- REC indicator during playback

✅ **Audio Controls**
- Background music (BGM) from `/public/music/bg-music.mp3`
- Auto-plays on intro (if not muted)
- Mute/unmute button (top-right)
- Music loops during playing stage

✅ **User Controls**
- Mute button (Volume icon)
- Close button (X icon)
- Replay button (on end screen)
- Full-screen dark experience

## Styling Notes

- **Fixed positioning:** `fixed inset-0 z-[100]`
- **Color scheme:** Black background with gold accents (#d4af37)
- **Max width:** Responsive with max-w-lg on playing stage
- **Animations:** CSS-based (no JavaScript animation loops)

## Audio File

**Required:** `/public/music/bg-music.mp3`
- Already exists in your project ✓
- Plays automatically on intro transition (if not muted)
- Loops continuously during playback
- Supports all modern browsers

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ | Full support |
| Firefox | ✅ | Full support |
| Safari | ✅ | Audio needs autoplay policy |
| Edge | ✅ | Full support |
| Mobile Chrome | ✅ | Responsive design |
| Mobile Safari | ⚠️ | Test audio autoplay |

## Common Issues & Solutions

**Issue:** Audio not playing
- **Solution:** Browser autoplay policy may block it. Check browser settings.

**Issue:** Image not loading
- **Solution:** Ensure `postImage` URL is valid and CORS-enabled.

**Issue:** Comments not showing
- **Solution:** Pass `comments` array with proper format. See comment object format above.

**Issue:** Jitter too strong
- **Solution:** Modify `@keyframes projectorJitter` in `app/globals.css`

**Issue:** Scroll too fast
- **Solution:** Increase duration in `filmScroll_20s` keyframe (change 20s to higher value)

## Customization

### Change Duration
In `ProjectorStory.tsx`:
```typescript
// Line ~55: Change 15000 to desired milliseconds
const duration = 15000; // 15 seconds
```

### Change Scroll Speed
In `app/globals.css`:
```css
@keyframes filmScroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-100%); }
}
/* Change "20s" in the playing stage animation */
animate-[filmScroll_20s_linear_infinite]
```

### Change Colors
Update Tailwind classes in component:
- Gold accent: `#d4af37` → your color
- Text colors: `text-white`, `text-gray-400`, etc.

### Change Date
In `ProjectorStory.tsx` line ~130:
```tsx
<div className="absolute bottom-4 right-4 text-[#d4af37] font-mono text-xs opacity-80 tracking-widest">
  20 . 11 . 2025  {/* Change this date */}
</div>
```

## Testing Checklist

- [ ] Component renders without errors
- [ ] Countdown displays 3→2→1
- [ ] Jitter effect visible on countdown
- [ ] Lens flare appears after countdown
- [ ] Image displays with sepia filter
- [ ] Film strips visible on edges
- [ ] Comments scroll smoothly
- [ ] Date stamp visible
- [ ] REC indicator blinks
- [ ] Mute button toggles audio
- [ ] End screen appears after 15s
- [ ] Replay button restarts cycle
- [ ] Close button closes component
- [ ] Mobile responsive layout works

## Example Data Structure

```typescript
// Confession object example
{
  id: "123",
  image_url: "https://example.com/image.jpg",
  content: "Một khoảnh khắc đáng nhớ",
  guests: {
    name: "Bạn Tôi"
  },
  comments: [
    {
      content: "Tuyệt vời!",
      guests: {
        name: "Bạn Khác"
      }
    }
  ]
}
```

## Performance Tips

1. **Optimize Image Size**
   - Aim for < 500KB for smooth loading
   - Use WebP format if supported

2. **Audio File Size**
   - Keep music file < 2MB
   - Use MP3 format for broad compatibility

3. **Comment Count**
   - Keep to < 10 comments for best UX
   - Long comments may get cut off due to scroll speed

## Accessibility

- Audio can be muted (important for users who don't want sound)
- Close button always available (X in top-right)
- High contrast colors for readability
- Large, tappable buttons

---

**Last Updated:** Current Session
**Version:** 1.0 (Premium Cinematic Experience)
**Status:** Production Ready ✨
