import { treasurePhotos } from "./treasure-photos";

export default function TreasureArt({ option, imageRef }) {
  const photo = treasurePhotos[option.id];
  return <span className="treasure-art treasure-photo" role="img" aria-label={option.treasure.name}>
    <span className="treasure-photo-crop"><img ref={imageRef} className="treasure-atlas" src={photo.src} alt="" data-column={photo.column} data-row={photo.row} style={{ left: `${-photo.column * 100}%`, top: `${-photo.row * 100}%` }} /><span className="treasure-sheen" aria-hidden="true" /></span>
    <span className="treasure-glint glint-one" aria-hidden="true">✦</span><span className="treasure-glint glint-two" aria-hidden="true">✧</span><span className="treasure-glint glint-three" aria-hidden="true">✦</span>
  </span>;
}
