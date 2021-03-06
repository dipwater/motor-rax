const { _transformList } = require('../list');
const { parseExpression } = require('../../parser');
const adapter = require('../../adapter').ali;
const genCode = require('../../codegen/genCode');

describe('Transform list', () => {
  it('transform array.map in JSXContainer with inline return', () => {
    const ast = parseExpression(`
      <View>{arr.map((val, idx) => <item data-value={val} data-key={idx} />)}</View>
    `);
    _transformList(ast, [], adapter);

    expect(genCode(ast).code).toEqual(`<View><block a:for={arr.map((val, idx) => ({
    val: val,
    idx: idx
  }))} a:for-item="val" a:for-index="idx"><item data-value={val} data-key={idx} /></block></View>`);
  });

  it('transform array.map in JSXContainer', () => {
    const ast = parseExpression(`
      <View>{arr.map((val, idx) => {
        return <item data-value={val} data-key={idx} />
      })}</View>
    `);
    _transformList(ast, [], adapter);

    expect(genCode(ast).code).toEqual(`<View><block a:for={arr.map((val, idx) => {
    return {
      val: val,
      idx: idx
    };
  })} a:for-item="val" a:for-index="idx"><item data-value={val} data-key={idx} /></block></View>`);
  });

  it('bind list variable', () => {
    const ast = parseExpression(`
      <View>{arr.map((item, idx) => <View>{item.title}<image source={{ uri: item.picUrl }} resizeMode={resizeMode} /></View>)}</View>
    `);
    _transformList(ast, [], adapter);

    expect(genCode(ast).code).toEqual(`<View><block a:for={arr.map((item, idx) => ({
    item: item
  }))} a:for-item="item" a:for-index="idx"><View>{item.title}<image source={{
        uri: item.picUrl
      }} resizeMode={resizeMode} /></View></block></View>`);
  });

  it('list elements', () => {
    const raw = `<View>{[1,2,3].map((val, idx) => {
      return <Text>{idx}</Text>;
    })}</View>`;
    const ast = parseExpression(raw);
    _transformList(ast, [], adapter);

    expect(genCode(ast, { concise: true }).code).toEqual('<View><block a:for={[1, 2, 3].map((val, idx) => { return { idx: idx }; })} a:for-item="val" a:for-index="idx"><Text>{idx}</Text></block></View>');
  });

  it('nested list', () => {
    const raw = `
<View
  className="header"
  onClick={() => {
    setWorkYear(workYear + 1);
  }}
>
  <View style={{ color: 'red' }}>workYear: {workYear}</View>
  <View style={{ color: 'red' }}>count: {count}</View>
  {arr.map(l1 => {
    return (
      <View>
        {l1.map(l2 => {
          return <View>{l2}</View>;
        })}
      </View>
    );
  })}
  <Loading count={count} />
  {props.children}
</View>`;
    const ast = parseExpression(raw);
    _transformList(ast, [], adapter);

    expect(genCode(ast, { concise: true }).code).toEqual(`<View className="header" onClick={() => { setWorkYear(workYear + 1); }}>
  <View style={{ color: 'red' }}>workYear: {workYear}</View>
  <View style={{ color: 'red' }}>count: {count}</View>
  <block a:for={arr.map((l1, index) => { return { l1: l1, l2: l2, index: index }; })} a:for-item="l1" a:for-index="index"><View>
        <block a:for={l1.map((l2, index) => { return { l2: l2 }; })} a:for-item="l2" a:for-index="index"><View>{l2}</View></block>
      </View></block>
  <Loading count={count} />
  {props.children}
</View>`);
  });

  it('list default params', () => {
    const raw = `<View>{[1,2,3].map(() => {
      return <Text>test</Text>;
    })}</View>`;
    const ast = parseExpression(raw);
    _transformList(ast, [], adapter);

    expect(genCode(ast, { concise: true }).code).toEqual('<View><block a:for={[1, 2, 3].map((item, index) => { return {}; })} a:for-item="item" a:for-index="index"><Text>test</Text></block></View>');
  });
});
