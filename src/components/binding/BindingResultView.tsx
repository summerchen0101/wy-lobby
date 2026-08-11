import { useWordData } from "../../wordData/useWordData";
import "../../features/shop/ShopCheckout.css";

type Props = {
  message: string;
  onConfirm: () => void;
};

/** Binding outcome dialog body — message + CONFIRM (WordData 57). */
export function BindingResultView({ message, onConfirm }: Props) {
  const w = useWordData();
  return (
    <div
      className="shop-checkout__summary-body shop-checkout__binding-success-body"
      role="status">
      <p className="shop-checkout__binding-success-text">{message}</p>
      <button
        type="button"
        className="shop-checkout__submit shop-checkout__submit--blue"
        onClick={onConfirm}>
        {w(57)}
      </button>
    </div>
  );
}
