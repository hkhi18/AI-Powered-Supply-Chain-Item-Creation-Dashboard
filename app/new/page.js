// New item page ( /new ): manual form with the UNSPSC picker. The chatbot does the same job in conversation.
import Explain from '@/components/Explain';
import NewItemForm from '@/components/NewItemForm';
import { UOMS } from '@/lib/items';

export const metadata = { title: 'New item · SCM Item Creation' };

export default function NewItemPage() {
  return (
    <main className="container section">
      <h1 className="page-title">New item</h1>
      <p className="lead">Fill in the form, or open the assistant (bottom right) and just describe the item. Both ways create a
        <b> draft</b>: nothing is used until a reviewer approves it.</p>
      <NewItemForm uoms={UOMS} />
      <Explain
        concepts={['Client Component', 'useActionState', 'Server Action', 'redirect()', 'fetch() with debounce', 'Route Handler /api/unspsc', 'SQL regex word match', 'Foreign key to unspsc']}
        en={<>
          <h4>How the form works</h4>
          <p>The UNSPSC box searches the 71,924 goods commodities in PostgreSQL while you type (<code>/api/unspsc</code>). The chosen code is
            stored in a hidden input. The Server Action <code>createItemAction</code> validates everything again on the server:
            the code must exist, the unit must be in the list, and a duplicate check compares the description and the part number
            with existing items.</p>
          <h4>Duplicates</h4>
          <p>Descriptions are compared word by word (Jaccard similarity). Different sizes lower the score on purpose, so a 5FR and a 10FR tube
            are separate items. A score of 80% or more, or the same manufacturer part number, blocks the save until you confirm.</p>
        </>}
        ar={<>
          <h4>كيف يعمل النموذج؟</h4>
          <p>مربع UNSPSC يبحث أثناء الكتابة في 71,924 رمز سلع داخل PostgreSQL (<code>/api/unspsc</code>)، ويُحفظ الرمز المختار في حقل مخفي.
            الدالة <code>createItemAction</code> تتحقق من كل شيء مرة ثانية على السيرفر: الرمز يجب أن يكون موجوداً، ووحدة القياس من القائمة،
            ويتم فحص التكرار بمقارنة الوصف ورقم قطعة المصنّع مع الأصناف الموجودة.</p>
          <h4>التكرار</h4>
          <p>تُقارن الأوصاف كلمة بكلمة. اختلاف المقاس يخفّض التشابه عمداً، لذلك الأنبوب 5FR والأنبوب 10FR صنفان مختلفان. إذا كان التشابه 80% أو أكثر
            أو تطابق رقم القطعة، يتوقف الحفظ حتى تؤكد أنه صنف مختلف.</p>
        </>}
      />
    </main>
  );
}
