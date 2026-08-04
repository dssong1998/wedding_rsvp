import type { CatalogItem } from '../config/catalog'

type Props = {
  item: CatalogItem | null
}

export function ItemReferencePanel({ item }: Props) {
  if (!item) {
    return <div className="ref-panel empty">아이템을 선택하세요</div>
  }
  return (
    <div className="ref-panel">
      <strong>{item.label_ko}</strong>
      {item.referenceImage ? (
        <img src={item.referenceImage} alt="" className="ref-thumb" />
      ) : null}
    </div>
  )
}
