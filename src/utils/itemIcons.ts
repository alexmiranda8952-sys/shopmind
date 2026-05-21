export function getItemEmoji(name: string): string {
  const n = name.toLowerCase();

  // Dairy
  if (/\bmilk\b|half.and.half|creamer/.test(n)) return '🥛';
  if (/\butter\b|margarine/.test(n)) return '🧈';
  if (/\bcheese\b|cheddar|mozzarella|parmesan|brie|gouda/.test(n)) return '🧀';
  if (/\byogurt\b|yoghurt/.test(n)) return '🫙';
  if (/\bcream\b/.test(n)) return '🥛';
  if (/\begg\b|\beggs\b/.test(n)) return '🥚';

  // Bread & Bakery
  if (/\bbread\b|\bloaf\b|\bbagel\b|\broll\b|\bbun\b/.test(n)) return '🍞';
  if (/\bmuffin\b|\bcroissant\b|\bscone\b/.test(n)) return '🥐';
  if (/\bcake\b|\bcupcake\b|\bbrownie\b/.test(n)) return '🎂';
  if (/\bcookie\b|\bbiscuit\b/.test(n)) return '🍪';
  if (/\bcracker\b/.test(n)) return '🫙';
  if (/\bdonut\b|\bdoughnut\b/.test(n)) return '🍩';
  if (/\bpita\b|\btortilla\b|\bwrap\b/.test(n)) return '🫓';

  // Meat & Seafood
  if (/\bchicken\b|\bpoultry\b|\bturkey\b/.test(n)) return '🍗';
  if (/\bbeef\b|\bsteak\b|\bground\b|\bburger\b|\bveal\b/.test(n)) return '🥩';
  if (/\bpork\b|\bham\b|\bprosciutto\b/.test(n)) return '🥩';
  if (/\bbacon\b/.test(n)) return '🥓';
  if (/\bsausage\b|\bhotdog\b|\bbratwurst\b/.test(n)) return '🌭';
  if (/\bsalmon\b|\bfish\b|\btuna\b|\bcod\b|\btilapia\b|\bhaddock\b/.test(n)) return '🐟';
  if (/\bshrimp\b|\bprawn\b|\blobster\b|\bcrab\b|\bseafood\b/.test(n)) return '🦐';

  // Vegetables
  if (/\btomato\b|\btomatoes\b/.test(n)) return '🍅';
  if (/\bonion\b|\bonions\b|\bshallot\b/.test(n)) return '🧅';
  if (/\bgarlic\b/.test(n)) return '🧄';
  if (/\bpotato\b|\bpotatoes\b|\bspud\b/.test(n)) return '🥔';
  if (/\bcarrot\b|\bcarrots\b/.test(n)) return '🥕';
  if (/\bbroccoli\b/.test(n)) return '🥦';
  if (/\blettuce\b|\bspinach\b|\bkale\b|\bargula\b|\bcabbage\b/.test(n)) return '🥬';
  if (/\bcorn\b|\bmaize\b/.test(n)) return '🌽';
  if (/\bpepper\b|\bcapsicum\b/.test(n)) return '🫑';
  if (/\bcucumber\b/.test(n)) return '🥒';
  if (/\bmushroom\b/.test(n)) return '🍄';
  if (/\bavocado\b/.test(n)) return '🥑';
  if (/\bzucchini\b|\bcourgette\b/.test(n)) return '🥒';
  if (/\bcelery\b/.test(n)) return '🥦';
  if (/\basparagus\b/.test(n)) return '🥦';
  if (/\bbeet\b|\bparsnip\b|\bturnip\b/.test(n)) return '🫚';
  if (/\bvegetable\b|\bveggie\b|\bveg\b/.test(n)) return '🥦';

  // Fruits
  if (/\bapple\b|\bapples\b/.test(n)) return '🍎';
  if (/\bbanana\b|\bbananas\b/.test(n)) return '🍌';
  if (/\borange\b|\bmandarin\b|\bclementine\b|\btangerine\b/.test(n)) return '🍊';
  if (/\bstrawberr/.test(n)) return '🍓';
  if (/\bgrape\b|\bgrapes\b/.test(n)) return '🍇';
  if (/\blemon\b|\blime\b/.test(n)) return '🍋';
  if (/\bwatermelon\b|\bmelon\b/.test(n)) return '🍉';
  if (/\bpeach\b|\bnectarine\b/.test(n)) return '🍑';
  if (/\bplum\b/.test(n)) return '🫐';
  if (/\bcherry\b|\bcherries\b/.test(n)) return '🍒';
  if (/\bpineapple\b/.test(n)) return '🍍';
  if (/\bmango\b/.test(n)) return '🥭';
  if (/\bcoconut\b/.test(n)) return '🥥';
  if (/\bblueberr\b|\braspberr\b|\bblackberr\b/.test(n)) return '🫐';
  if (/\bpear\b/.test(n)) return '🍐';
  if (/\bfig\b/.test(n)) return '🍈';
  if (/\bfruit\b/.test(n)) return '🍎';

  // Drinks
  if (/\bcoffee\b|\bespresso\b|\blatte\b|\bcappuccino\b/.test(n)) return '☕';
  if (/\btea\b/.test(n)) return '🍵';
  if (/\bjuice\b/.test(n)) return '🧃';
  if (/\bwater\b|\bsparkling\b/.test(n)) return '💧';
  if (/\bbeer\b|\bale\b|\blager\b|\bipa\b/.test(n)) return '🍺';
  if (/\bwine\b/.test(n)) return '🍷';
  if (/\bwhiskey\b|\bwhisky\b|\bvodka\b|\bgin\b|\brum\b|\bspirits\b/.test(n)) return '🥃';
  if (/\bsoda\b|\bcola\b|\bpepsi\b|\bsprite\b/.test(n)) return '🥤';
  if (/\benergy drink\b|\bgatorade\b/.test(n)) return '🥤';
  if (/\bdrink\b|\bbeverage\b/.test(n)) return '🥤';

  // Pantry / Dry Goods
  if (/\bpasta\b|\bnoodle\b|\bspaghetti\b|\bpenne\b|\brigatoni\b|\bfettuccine\b|\blinguine\b/.test(n)) return '🍝';
  if (/\brice\b/.test(n)) return '🍚';
  if (/\bflour\b/.test(n)) return '🌾';
  if (/\bsugar\b/.test(n)) return '🍬';
  if (/\bsalt\b/.test(n)) return '🧂';
  if (/\bpepper\b|\bspice\b|\bherb\b|\bseasoning\b|\bcinnamon\b|\bpaprika\b|\bcumin\b/.test(n)) return '🌿';
  if (/\boil\b|\bolive\b|\bcanola\b|\bvegetable oil\b/.test(n)) return '🫙';
  if (/\bvinegar\b/.test(n)) return '🫙';
  if (/\bsauce\b|\bketchup\b|\bmustard\b|\bmayo\b|\bmayonnaise\b|\bsoy\b|\bteriyaki\b/.test(n)) return '🫙';
  if (/\bsalsa\b|\bguacamole\b/.test(n)) return '🫙';
  if (/\bsoup\b|\bbroth\b|\bstock\b/.test(n)) return '🍲';
  if (/\bcereal\b|\bgranola\b/.test(n)) return '🥣';
  if (/\boat\b|\bporridge\b/.test(n)) return '🥣';
  if (/\bchocolate\b|\bcocoa\b/.test(n)) return '🍫';
  if (/\bcandy\b|\bsweet\b|\bgum\b/.test(n)) return '🍬';
  if (/\bchip\b|\bcrisp\b|\bpopcorn\b/.test(n)) return '🍿';
  if (/\bpretzels\b/.test(n)) return '🥨';
  if (/\bnut\b|\balmond\b|\bwalnut\b|\bcashew\b|\bpecan\b/.test(n)) return '🥜';
  if (/\bpeanut butter\b/.test(n)) return '🥜';
  if (/\bhoney\b/.test(n)) return '🍯';
  if (/\bjam\b|\bjelly\b|\bpreserve\b|\bmarmalade\b/.test(n)) return '🍓';
  if (/\bbean\b|\blentil\b|\bchickpea\b/.test(n)) return '🫘';
  if (/\bcanned\b|\btin\b/.test(n)) return '🥫';

  // Frozen & Desserts
  if (/\bice cream\b|\bgelato\b|\bsorbet\b/.test(n)) return '🍦';
  if (/\bfrozen\b/.test(n)) return '🧊';
  if (/\bpizza\b/.test(n)) return '🍕';

  // Household & Cleaning
  if (/\bsoap\b|\bdetergent\b|\blaundry\b/.test(n)) return '🧴';
  if (/\bpaper towel\b|\bkitchen roll\b/.test(n)) return '🧻';
  if (/\btoilet paper\b|\btoilet roll\b|\btissue\b/.test(n)) return '🧻';
  if (/\btrash bag\b|\bgarbage bag\b|\bbin bag\b/.test(n)) return '🗑️';
  if (/\bbleach\b|\bcleaner\b|\bdisinfect\b/.test(n)) return '🧹';
  if (/\bsponge\b/.test(n)) return '🧽';
  if (/\bfoil\b|\bwrap\b|\bplastic wrap\b/.test(n)) return '📦';

  // Baby & Personal Care
  if (/\bdiaper\b|\bnappy\b/.test(n)) return '👶';
  if (/\bvitamin\b|\bsupplement\b|\bmedication\b|\bmedicine\b/.test(n)) return '💊';
  if (/\bshampoo\b|\bconditioner\b/.test(n)) return '🧴';
  if (/\btoothpaste\b|\btoothbrush\b/.test(n)) return '🪥';
  if (/\bdeodorant\b/.test(n)) return '🧴';

  // Pet
  if (/\bdog food\b|\bcat food\b|\bpet food\b|\bkibble\b/.test(n)) return '🐾';

  return '🛒';
}
